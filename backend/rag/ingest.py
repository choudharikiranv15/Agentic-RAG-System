"""
Document Ingestion Pipeline

This is the "data engineering" part of RAG - arguably the most important!

The Pipeline:
1. Load documents (PDF, DOCX, etc.)
2. Chunk them into smaller pieces
3. Generate embeddings
4. Store in vector database

Key Concept: Why Chunking?
---------------------------
Problem: A 50-page PDF is too large for the LLM's context window.
Solution: Split it into ~1000 character chunks.

Overlap: We use 200 character overlap between chunks.
Why? To preserve context across chunk boundaries.

Example:
Chunk 1: "...the company was founded in 1995. The CEO is John..."
Chunk 2: "...The CEO is John Smith. He has 20 years of experience..."
         ↑ Overlap ensures we don't lose the connection!
"""


from typing import List
import os
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from langchain_core.documents import Document


from backend.rag.embed import get_embeddings
from backend.db.chroma import get_chroma_client, CHROMA_DB_DIR

# Import all loaders
from backend.loaders.pdf import load_pdf
from backend.loaders.docx import load_docx
from backend.loaders.ppt import load_ppt
from backend.loaders.excel import load_excel


def ingest_files(file_paths: List[str]) -> dict:
    """
    Ingest a list of files into the vector database.
    
    Returns:
        dict with statistics about the ingestion
    """
    documents = []
    stats = {
        "files_processed": 0,
        "files_failed": 0,
        "total_chunks": 0,
        "total_documents": 0
    }
    
    # Step 1: Load all documents
    print("\n" + "="*60)
    print("STEP 1: LOADING DOCUMENTS")
    print("="*60)
    
    for file_path in file_paths:
        ext = os.path.splitext(file_path)[1].lower()
        
        try:
            if ext == ".pdf":
                docs = load_pdf(file_path)
            elif ext == ".docx":
                docs = load_docx(file_path)
            elif ext == ".pptx":
                docs = load_ppt(file_path)
            elif ext in [".xlsx", ".xls"]:
                docs = load_excel(file_path)
            elif ext == ".txt":
                with open(file_path, "r", encoding="utf-8") as f:
                    content = f.read()
                    if content.strip():
                        docs = [Document(
                            page_content=content,
                            metadata={"source": file_path}
                        )]
                        print(f"📄 Loaded TXT: {file_path}")
                    else:
                        docs = []
            else:
                print(f"⚠️  Skipping unsupported file type: {ext}")
                continue
            
            documents.extend(docs)
            stats["files_processed"] += 1
            stats["total_documents"] += len(docs)
            
        except Exception as e:
            print(f"❌ Failed to load {file_path}: {e}")
            stats["files_failed"] += 1
    
    if not documents:
        print("\n⚠️  No documents to ingest!")
        return stats
    
    # Step 2: Chunking
    print("\n" + "="*60)
    print("STEP 2: CHUNKING DOCUMENTS")
    print("="*60)
    print(f"Splitting {len(documents)} documents into chunks...")
    print(f"Chunk size: 1000 characters")
    print(f"Overlap: 200 characters (to preserve context)")
    
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        length_function=len,
        separators=["\n\n", "\n", " ", ""]  # Try to split on paragraphs first
    )
    
    splits = text_splitter.split_documents(documents)
    stats["total_chunks"] = len(splits)
    print(f"✅ Created {len(splits)} chunks")
    
    # Step 3: Embedding and Storage
    print("\n" + "="*60)
    print("STEP 3: GENERATING EMBEDDINGS & STORING")
    print("="*60)
    
    embedding_function = get_embeddings()
    client = get_chroma_client()
    
    # Use LangChain's Chroma wrapper
    vector_store = Chroma(
        client=client,
        collection_name="rag_collection",
        embedding_function=embedding_function,
    )
    
    print(f"Adding {len(splits)} chunks to vector database...")
    print("(This may take a minute for large documents)")
    
    # Add documents
    vector_store.add_documents(documents=splits)
    
    print(f"\n✅ INGESTION COMPLETE!")
    print(f"   Files processed: {stats['files_processed']}")
    print(f"   Files failed: {stats['files_failed']}")
    print(f"   Total chunks stored: {stats['total_chunks']}")
    print(f"   Database location: {CHROMA_DB_DIR}")
    
    return stats


if __name__ == "__main__":
    # Test with sample files
    import sys
    
    if len(sys.argv) > 1:
        files = sys.argv[1:]
        ingest_files(files)
    else:
        print("Usage: python -m backend.rag.ingest <file1> <file2> ...")
