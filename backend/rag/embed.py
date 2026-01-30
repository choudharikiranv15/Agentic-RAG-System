"""
Embedding Module

This module provides text embedding functionality.

Key Concept: What are Embeddings?
------------------------------------
Embeddings are numerical representations of text that capture semantic meaning.

Example:
- "The cat sat on the mat" → [0.2, 0.8, 0.1, 0.5, ...]
- "A feline rested on the rug" → [0.21, 0.79, 0.12, 0.51, ...]

Notice: Similar meanings = similar numbers!

Why do we need embeddings?
- Computers can't understand "meaning" directly
- Embeddings convert meaning into math
- This allows us to find similar documents using vector similarity

Two Options:
1. Google Gemini Embeddings (Cloud, High Quality)
2. HuggingFace Local Embeddings (Free, Runs on your machine)
"""

from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_google_genai import GoogleGenerativeAIEmbeddings
import os
from dotenv import load_dotenv

load_dotenv()


def get_embeddings(use_local=True):
    """
    Returns the embedding model.
    
    Strategy:
    1. Use local HuggingFace by default (no API limits!)
    2. Can switch to Google Gemini if needed
    
    Args:
        use_local: If True, use local embeddings. If False, try Google first.
    
    This ensures the system works even without an API key!
    """
    
    # For initial testing, use local embeddings to avoid rate limits
    if use_local:
        print("[LOCAL] Using HuggingFace embeddings (all-MiniLM-L6-v2)")
        print("   First run will download the model (~80MB)")
        
        return HuggingFaceEmbeddings(
            model_name="all-MiniLM-L6-v2",
            model_kwargs={'device': 'cpu'},  # Use 'cuda' if you have GPU
            encode_kwargs={'normalize_embeddings': True}  # Improves similarity search
        )
    
    # Try Google Gemini if requested
    api_key = os.getenv("GOOGLE_API_KEY")
    
    if api_key:
        try:
            print("🌐 Using Google Gemini Embeddings (Cloud)")
            return GoogleGenerativeAIEmbeddings(
                model="models/embedding-001",
                google_api_key=api_key
            )
        except Exception as e:
            print(f"⚠️  Google Embeddings failed: {e}")
            print("⚠️  Falling back to local embeddings...")
    
    # Fallback to local embeddings
    print("💻 Using local HuggingFace embeddings (all-MiniLM-L6-v2)")
    print("   First run will download the model (~80MB)")
    
    return HuggingFaceEmbeddings(
        model_name="all-MiniLM-L6-v2",
        model_kwargs={'device': 'cpu'},  # Use 'cuda' if you have GPU
        encode_kwargs={'normalize_embeddings': True}  # Improves similarity search
    )


if __name__ == "__main__":
    # Test embeddings
    embeddings = get_embeddings()
    test_text = "This is a test sentence."
    vector = embeddings.embed_query(test_text)
    print(f"\n✅ Embedding generated!")
    print(f"   Text: '{test_text}'")
    print(f"   Vector dimension: {len(vector)}")
    print(f"   First 5 values: {vector[:5]}")
