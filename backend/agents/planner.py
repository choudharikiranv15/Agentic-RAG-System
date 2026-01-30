"""
Planner Agent - The Brain of the Agentic RAG System

Supports multiple LLM providers:
1. Google Gemini 2.0 Flash (Primary)
2. OpenRouter (Fallback - supports many models)

Key Concept: RAG (Retrieval-Augmented Generation)
--------------------------------------------------
1. Search for relevant documents
2. Pass them to the LLM as context
3. LLM generates answer based on context
"""

import google.generativeai as genai
from backend.rag.search import search_documents
import os
from dotenv import load_dotenv
import requests

load_dotenv()


def get_gemini_response(prompt: str) -> str:
    """Get response from Google Gemini"""
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError("GOOGLE_API_KEY not found")
    
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-2.5-flash')
    response = model.generate_content(prompt)
    return response.text


def get_openrouter_response(prompt: str, model: str = "mistralai/mistral-nemo") -> str:
    """
    Get response from OpenRouter (fallback option)

    Working Mistral models on OpenRouter:
    - mistralai/mistral-nemo (default)
    - mistralai/mixtral-8x7b-instruct
    - mistralai/mistral-7b-instruct-v0.1
    - mistral/mistral-small-24b-instruct-2501

    Get API key at: https://openrouter.ai/keys
    """
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        raise ValueError("OPENROUTER_API_KEY not found in .env file")
    
    try:
        response = requests.post(
            url="https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "HTTP-Referer": "http://localhost:3000",  # Optional but recommended
                "X-Title": "Agentic RAG System",  # Optional but recommended
                "Content-Type": "application/json"
            },
            json={
                "model": model,
                "messages": [
                    {"role": "user", "content": prompt}
                ]
            },
            timeout=30
        )
        
        if response.status_code != 200:
            error_detail = response.json() if response.text else "No error details"
            raise Exception(f"OpenRouter API error (status {response.status_code}): {error_detail}")
        
        result = response.json()
        return result["choices"][0]["message"]["content"]
        
    except requests.exceptions.RequestException as e:
        raise Exception(f"OpenRouter request failed: {str(e)}")
    except KeyError as e:
        raise Exception(f"Unexpected OpenRouter response format: {str(e)}")



def get_llm_response(prompt: str, provider: str = "auto") -> str:
    """
    Get LLM response with automatic fallback.
    
    Args:
        prompt: The prompt to send
        provider: "gemini", "openrouter", or "auto" (tries Gemini first, falls back to OpenRouter)
    
    Returns:
        The LLM's response text
    """
    if provider == "gemini":
        return get_gemini_response(prompt)
    elif provider == "openrouter":
        return get_openrouter_response(prompt)
    else:  # auto
        try:
            print("   [LLM] Using Google Gemini 2.0 Flash...")
            return get_gemini_response(prompt)
        except Exception as e:
            print(f"   [WARN] Gemini failed: {e}")
            print("   [LLM] Falling back to OpenRouter...")
            return get_openrouter_response(prompt)


def ask_question(question: str, verbose: bool = True, provider: str = "auto") -> dict:
    """
    Ask a question using the RAG system.
    
    Args:
        question: The user's question
        verbose: Whether to print the thinking process
        provider: "gemini", "openrouter", or "auto"
        
    Returns:
        dict with 'output' (answer), 'context' (retrieved docs), and 'sources'
    """
    
    if verbose:
        print("\n" + "="*60)
        print("[STEP 1] SEARCHING DOCUMENTS")
        print("="*60)
    
    # Step 1: Retrieve relevant documents
    search_results = search_documents(question, n_results=5)
    
    if not search_results:
        return {
            "output": "I couldn't find any relevant information in the documents.",
            "context": "",
            "sources": []
        }
    
    # Format context for the LLM
    context_parts = []
    sources = []
    seen_sources = set()

    for i, result in enumerate(search_results, 1):
        content = result['content']
        source = result['metadata'].get('source', 'unknown')
        page = result['metadata'].get('page', '')

        # Clean up source path - extract just filename
        import os
        if os.sep in source or '/' in source:
            source = os.path.basename(source)
            
        # Clean up any potential temp prefixes if they still exist (though new ingestion method prevents this)
        # We prefer the actual filename now


        citation = f"[Source: {source}"
        if page:
            citation += f", Page {page}"
        citation += "]"

        context_parts.append(f"Document {i}:\n{content}\n{citation}")

        # Avoid duplicate sources in the list
        source_key = f"{source}:{page}"
        if source_key not in seen_sources:
            sources.append(citation)
            seen_sources.add(source_key)
    
    context = "\n\n---\n\n".join(context_parts)
    
    if verbose:
        print(f"\n   [OK] Found {len(search_results)} relevant chunks")
        print("\n" + "="*60)
        print("[STEP 2] GENERATING ANSWER")
        print("="*60)
    
    # Step 2: Generate answer using LLM
    prompt = f"""You are an expert AI assistant helping users understand documents.
Provide clear, well-structured answers based on the provided context.

CONTEXT FROM DOCUMENTS:
{context}

USER QUESTION: {question}

INSTRUCTIONS:
1. Answer based ONLY on the context provided above
2. Structure your response clearly with bullet points or numbered lists when appropriate
3. If explaining a process or requirements, break it down into clear steps
4. Be comprehensive but avoid unnecessary repetition
5. If the context doesn't contain enough information, clearly state what's missing
6. Do NOT mention temporary file paths - just say "the documents" or use the original filename if visible

RESPONSE:"""
    
    try:
        answer = get_llm_response(prompt, provider=provider)
    except Exception as e:
        if verbose:
            print(f"\n[ERROR] Error generating answer: {e}")
        answer = f"Error: Could not generate answer. {str(e)}"
    
    return {
        "output": answer,
        "context": context,
        "sources": sources
    }


if __name__ == "__main__":
    # Test the agent
    print("\n" + "="*60)
    print("[TEST] TESTING AGENTIC RAG SYSTEM")
    print("="*60)

    test_question = "What is the objective of this assignment?"

    print(f"\n[QUESTION] {test_question}")

    try:
        result = ask_question(test_question, verbose=True, provider="auto")

        print("\n" + "="*60)
        print("[ANSWER]")
        print("="*60)
        print(result['output'])

        print("\n" + "="*60)
        print("[SOURCES]")
        print("="*60)
        for source in result['sources']:
            print(f"  - {source}")

    except ValueError as e:
        print(f"\n[ERROR] {e}")
    except Exception as e:
        print(f"\n[ERROR] Unexpected: {e}")
        import traceback
        traceback.print_exc()
