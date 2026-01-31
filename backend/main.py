"""
FastAPI Backend for Agentic RAG System

This is the main API server that connects the frontend to the RAG backend.

Endpoints:
- POST /upload: Upload and ingest documents
- POST /chat: Ask questions and get answers (with streaming support)
- GET /status: Health check
- GET /documents/stats: Get document statistics
- DELETE /clear: Clear the vector database
"""

from fastapi import FastAPI, UploadFile, File, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
import os
import tempfile
import asyncio
import json
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from backend.rag.ingest import ingest_files
from backend.agents.planner import ask_question
from backend.db.chroma import get_chroma_client, CHROMA_DB_DIR

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)

# Initialize FastAPI app
app = FastAPI(
    title="Agentic RAG System",
    description="AI-powered document Q&A system with agentic reasoning",
    version="1.0.0"
)

# Add rate limiter to app
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Configure CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request/Response Models
class ChatRequest(BaseModel):
    question: str
    provider: str = "auto"  # "gemini", "openrouter", or "auto"


class ChatResponse(BaseModel):
    answer: str
    sources: List[str]
    context: str


class StatusResponse(BaseModel):
    status: str
    message: str


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint - API information"""
    return {
        "name": "Agentic RAG System API",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "POST /upload": "Upload documents (PDF, DOCX, PPTX, XLSX, TXT)",
            "POST /chat": "Ask questions (JSON response)",
            "POST /chat/stream": "Ask questions (SSE streaming)",
            "GET /status": "Health check",
            "GET /documents/stats": "Get document statistics",
            "DELETE /clear": "Clear vector database"
        }
    }


# Health check endpoint
@app.get("/status", response_model=StatusResponse)
async def status():
    """Health check endpoint"""
    return StatusResponse(
        status="healthy",
        message="Agentic RAG System is running"
    )


# Upload endpoint
@app.post("/upload")
@limiter.limit("5/minute")  # Max 5 uploads per minute
async def upload_files(request: Request, files: List[UploadFile] = File(...)):
    """
    Upload and ingest documents into the vector database.
    
    Supports: PDF, DOCX, PPTX, XLSX, TXT
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")
    
    # File size limit: 10MB per file
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB in bytes
    
    temp_files = []
    
    try:
        # Save uploaded files temporarily
        for file in files:
            # Check file size
            file.file.seek(0, 2)  # Seek to end
            file_size = file.file.tell()
            file.file.seek(0)  # Reset to beginning
            
            if file_size > MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=413,
                    detail=f"File '{file.filename}' is too large ({file_size / 1024 / 1024:.1f}MB). Maximum size is 10MB."
                )
            
            if file_size == 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"File '{file.filename}' is empty."
                )
            
            # Validate file extension
            ext = os.path.splitext(file.filename)[1].lower()
            if ext not in ['.pdf', '.docx', '.pptx', '.xlsx', '.xls', '.txt']:
                raise HTTPException(
                    status_code=400,
                    detail=f"Unsupported file type: {ext}. Supported: PDF, DOCX, PPTX, XLSX, TXT"
                )
            
            # Create a user-specific temp directory for this upload
            upload_dir = tempfile.mkdtemp()
            temp_files.append(upload_dir) # Keep track to clean up later
            
            # Save file with ORIGINAL filename
            clean_filename = os.path.basename(file.filename)
            file_path = os.path.join(upload_dir, clean_filename)
            
            with open(file_path, "wb") as f:
                content = await file.read()
                f.write(content)
            
            temp_files.append(file_path) # Add to list for ingestion
        
        # Filter out directories from the ingestion list (we only ingest files)
        files_to_ingest = [f for f in temp_files if os.path.isfile(f)]
        directories_to_clean = [f for f in temp_files if os.path.isdir(f)]

        # Ingest files
        stats = ingest_files(files_to_ingest)
        
        return {
            "status": "success",
            "message": f"Successfully ingested {stats['files_processed']} file(s)",
            "stats": stats
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")
    
    finally:
        # Clean up temp files and directories
        for path in temp_files:
            try:
                if os.path.isfile(path):
                    os.unlink(path)
                elif os.path.isdir(path):
                    import shutil
                    shutil.rmtree(path)
            except:
                pass


# Chat endpoint
@app.post("/chat", response_model=ChatResponse)
@limiter.limit("20/minute")  # Max 20 chat requests per minute
async def chat(http_request: Request, request: ChatRequest):
    """
    Ask a question and get an AI-generated answer based on ingested documents.
    
    The agent will:
    1. Search for relevant documents
    2. Use LLM to generate answer
    3. Cite sources
    """
    if not request.question or len(request.question.strip()) == 0:
        raise HTTPException(status_code=400, detail="Question cannot be empty")
    
    # Validate question length (max 500 characters)
    MAX_QUESTION_LENGTH = 500
    if len(request.question) > MAX_QUESTION_LENGTH:
        raise HTTPException(
            status_code=400, 
            detail=f"Question too long ({len(request.question)} chars). Maximum is {MAX_QUESTION_LENGTH} characters."
        )
    
    try:
        # Get answer from agent
        result = ask_question(
            request.question,
            verbose=False,
            provider=request.provider
        )
        
        return ChatResponse(
            answer=result['output'],
            sources=result['sources'],
            context=result['context']
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate answer: {str(e)}")


# Streaming chat endpoint
@app.post("/chat/stream")
@limiter.limit("20/minute")  # Max 20 streaming requests per minute
async def chat_stream(http_request: Request, request: ChatRequest):
    """
    Streaming version of the chat endpoint.

    Returns Server-Sent Events (SSE) with:
    - type: "thinking" - Agent is processing
    - type: "sources" - Retrieved documents
    - type: "answer" - The generated answer
    - type: "done" - Stream complete
    """
    if not request.question or len(request.question.strip()) == 0:
        raise HTTPException(status_code=400, detail="Question cannot be empty")
    
    # Validate question length
    MAX_QUESTION_LENGTH = 500
    if len(request.question) > MAX_QUESTION_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"Question too long ({len(request.question)} chars). Maximum is {MAX_QUESTION_LENGTH} characters."
        )

    async def generate():
        try:
            # Step 1: Send thinking status
            yield f"data: {json.dumps({'type': 'thinking', 'message': 'Searching documents...'})}\n\n"

            # Import here to avoid circular imports
            from backend.rag.search import search_documents

            # Search for relevant documents
            search_results = search_documents(request.question, n_results=5)

            if not search_results:
                yield f"data: {json.dumps({'type': 'answer', 'content': 'I could not find any relevant information in the documents.'})}\n\n"
                yield f"data: {json.dumps({'type': 'done'})}\n\n"
                return

            # Step 2: Send sources
            sources = []
            for result in search_results:
                source = result['metadata'].get('source', 'unknown')
                page = result['metadata'].get('page', '')
                citation = f"{source}"
                if page:
                    citation += f" (Page {page})"
                sources.append(citation)

            yield f"data: {json.dumps({'type': 'sources', 'sources': sources})}\n\n"

            # Step 3: Generate answer
            yield f"data: {json.dumps({'type': 'thinking', 'message': 'Generating answer...'})}\n\n"

            result = ask_question(
                request.question,
                verbose=False,
                provider=request.provider
            )

            # Step 4: Send answer
            yield f"data: {json.dumps({'type': 'answer', 'content': result['output']})}\n\n"

            # Step 5: Done
            yield f"data: {json.dumps({'type': 'done'})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


# Document statistics endpoint
@app.get("/documents/stats")
async def get_document_stats():
    """
    Get statistics about the indexed documents.

    Returns:
    - total_chunks: Number of document chunks in the database
    - database_exists: Whether the database has been initialized
    """
    try:
        if not os.path.exists(CHROMA_DB_DIR):
            return {
                "status": "success",
                "total_chunks": 0,
                "database_exists": False,
                "message": "No documents have been ingested yet"
            }

        client = get_chroma_client()
        collection = client.get_or_create_collection("rag_collection")
        count = collection.count()

        return {
            "status": "success",
            "total_chunks": count,
            "database_exists": True,
            "message": f"Database contains {count} document chunks"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get stats: {str(e)}")


# List documents endpoint
@app.get("/documents")
async def list_documents():
    """
    List all ingested documents (only shows clean filenames, not temp paths).
    """
    try:
        if not os.path.exists(CHROMA_DB_DIR):
            return {"documents": []}

        client = get_chroma_client()
        collection = client.get_or_create_collection("rag_collection")

        # Get all metadata
        result = collection.get(include=['metadatas'])
        metadatas = result['metadatas']

        # Extract unique filenames - filter out temp file patterns
        unique_files = set()
        for meta in metadatas:
            if not meta:
                continue

            filename = None
            if 'filename' in meta:
                filename = meta['filename']
            elif 'source' in meta:
                filename = os.path.basename(meta['source'])

            if filename:
                # Skip temp file patterns (e.g., tmp_xyz123.pdf, tmpabcdef.pdf)
                if filename.startswith('tmp') and ('_' in filename or len(filename) > 20):
                    continue
                unique_files.add(filename)

        return {"documents": sorted(list(unique_files))}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list documents: {str(e)}")


# Delete document endpoint
@app.delete("/documents/{filename}")
async def delete_document(filename: str):
    """
    Delete a specific document by filename.
    Removes all chunks associated with the document from the vector database.
    """
    try:
        client = get_chroma_client()
        collection = client.get_or_create_collection("rag_collection")

        # Get all documents with their IDs and metadata
        result = collection.get(include=['metadatas'])
        ids = result['ids']
        metadatas = result['metadatas']

        # Find IDs that match the filename
        ids_to_delete = []
        for doc_id, meta in zip(ids, metadatas):
            if not meta:
                continue

            # Check both 'filename' and 'source' fields
            doc_filename = meta.get('filename', '')
            doc_source = os.path.basename(meta.get('source', ''))

            if filename == doc_filename or filename == doc_source:
                ids_to_delete.append(doc_id)

        if ids_to_delete:
            collection.delete(ids=ids_to_delete)
            return {
                "status": "success",
                "message": f"Deleted {filename} ({len(ids_to_delete)} chunks removed)"
            }
        else:
            return {
                "status": "warning",
                "message": f"No chunks found for {filename}"
            }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete document: {str(e)}")



# Cleanup temp files from database
@app.post("/documents/cleanup")
async def cleanup_temp_documents():
    """
    Remove old temporary file entries from the database.
    This cleans up entries with temp file patterns like tmp_xyz.pdf
    """
    try:
        client = get_chroma_client()
        collection = client.get_or_create_collection("rag_collection")

        # Get all documents
        result = collection.get(include=['metadatas'])
        ids = result['ids']
        metadatas = result['metadatas']

        # Find IDs with temp file patterns
        ids_to_delete = []
        for doc_id, meta in zip(ids, metadatas):
            if not meta:
                continue

            filename = meta.get('filename', '') or os.path.basename(meta.get('source', ''))

            # Match temp file patterns
            if filename.startswith('tmp') and ('_' in filename or len(filename) > 20):
                ids_to_delete.append(doc_id)

        if ids_to_delete:
            collection.delete(ids=ids_to_delete)
            return {
                "status": "success",
                "message": f"Cleaned up {len(ids_to_delete)} temporary file entries"
            }
        else:
            return {
                "status": "success",
                "message": "No temporary files to clean up"
            }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to cleanup: {str(e)}")


# Clear database endpoint
@app.delete("/clear")
async def clear_database():
    """
    Clear the vector database (for testing purposes).
    WARNING: This will delete all ingested documents!
    """
    try:
        import shutil

        if os.path.exists(CHROMA_DB_DIR):
            shutil.rmtree(CHROMA_DB_DIR)
            return {
                "status": "success",
                "message": "Vector database cleared successfully"
            }
        else:
            return {
                "status": "success",
                "message": "Database was already empty"
            }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to clear database: {str(e)}")


# Run with: uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
