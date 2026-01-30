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
    model = genai.GenerativeModel('gemini-2.0-flash-001')
    response = model.generate_content(prompt)
    return response.text


def get_openrouter_response(prompt: str, model: str = "qwen/qwen-2.5-7b-instruct:free") -> str:
    """
    Get response from OpenRouter (fallback option)
    
    OpenRouter provides access to many free models:
    - google/gemini-2.0-flash-exp:free
    - meta-llama/llama-3.3-70b-instruct:free
    - qwen/qwen-2.5-7b-instruct:free
    
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
            print("   🌐 Using Google Gemini 2.0 Flash...")
            return get_gemini_response(prompt)
        except Exception as e:
            print(f"   ⚠️  Gemini failed: {e}")
            print("   🔄 Falling back to OpenRouter...")
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
        print("🔍 STEP 1: SEARCHING DOCUMENTS")
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
    
    for i, result in enumerate(search_results, 1):
        content = result['content']
        source = result['metadata'].get('source', 'unknown')
        page = result['metadata'].get('page', '')
        
        citation = f"[Source: {source}"
        if page:
            citation += f", Page {page}"
        citation += "]"
        
        context_parts.append(f"Document {i}:\n{content}\n{citation}")
        sources.append(citation)
    
    context = "\n\n---\n\n".join(context_parts)
    
    if verbose:
        print(f"\n   ✅ Found {len(search_results)} relevant chunks")
        print("\n" + "="*60)
        print("🤖 STEP 2: GENERATING ANSWER")
        print("="*60)
    
    # Step 2: Generate answer using LLM
    prompt = f"""You are a helpful AI assistant that answers questions based on provided documents.

Context from documents:

{context}

Question: {question}

Instructions:
- Answer based ONLY on the context above
- If the context doesn't contain the answer, say "I don't have enough information to answer that"
- Cite your sources (mention the document name)
- Be concise but complete

Answer:"""
    
    try:
        answer = get_llm_response(prompt, provider=provider)
    except Exception as e:
        if verbose:
            print(f"\n⚠️  Error generating answer: {e}")
        answer = f"Error: Could not generate answer. {str(e)}"
    
    return {
        "output": answer,
        "context": context,
        "sources": sources
    }


if __name__ == "__main__":
    # Test the agent
    print("\n" + "="*60)
    print("🤖 TESTING AGENTIC RAG SYSTEM")
    print("="*60)
    
    test_question = "What is the objective of this assignment?"
    
    print(f"\n❓ Question: {test_question}")
    
    try:
        result = ask_question(test_question, verbose=True, provider="auto")
        
        print("\n" + "="*60)
        print("📝 FINAL ANSWER:")
        print("="*60)
        print(result['output'])
        
        print("\n" + "="*60)
        print("📚 SOURCES:")
        print("="*60)
        for source in result['sources']:
            print(f"  • {source}")
        
    except ValueError as e:
        print(f"\n❌ Error: {e}")
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
