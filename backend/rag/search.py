"""
Document Search Module

This module handles similarity search in the vector database.

Key Concept: Similarity Search
-------------------------------
How do we find relevant documents?

1. Convert user query to embedding: "What is RAG?" → [0.3, 0.7, ...]
2. Compare with all document embeddings using cosine similarity
3. Return the top K most similar chunks

Cosine Similarity:
- Measures the angle between two vectors
- Range: -1 (opposite) to 1 (identical)
- Example: "car" and "automobile" might have similarity of 0.85
"""

from typing import List, Dict, Any
from langchain_chroma import Chroma
from backend.db.chroma import get_chroma_client
from backend.rag.embed import get_embeddings


def search_documents(query: str, n_results: int = 5) -> List[Dict[str, Any]]:
    """
    Search for documents relevant to the query using vector similarity.
    
    Args:
        query: The search query (e.g., "What is the submission deadline?")
        n_results: Number of results to return (default: 5)
        
    Returns:
        List of dictionaries with 'content' and 'metadata' keys
        
    Example:
        results = search_documents("What is RAG?", n_results=3)
        for result in results:
            print(result['content'])
            print(result['metadata']['source'])
    """
    print(f"🔍 Searching for: '{query}'")
    
    try:
        client = get_chroma_client()
        embedding_function = get_embeddings()
        
        vector_store = Chroma(
            client=client,
            collection_name="rag_collection",
            embedding_function=embedding_function,
        )
        
        # Perform similarity search
        results = vector_store.similarity_search(query, k=n_results)
        
        # Format results
        formatted_results = [
            {
                "content": res.page_content,
                "metadata": res.metadata
            }
            for res in results
        ]
        
        print(f"   ✅ Found {len(formatted_results)} relevant chunks")
        
        return formatted_results
        
    except Exception as e:
        print(f"   ❌ Error searching documents: {e}")
        return []


def search_with_scores(query: str, n_results: int = 5) -> List[tuple]:
    """
    Search with similarity scores (for debugging/analysis).
    
    Returns:
        List of (Document, score) tuples
    """
    try:
        client = get_chroma_client()
        embedding_function = get_embeddings()
        
        vector_store = Chroma(
            client=client,
            collection_name="rag_collection",
            embedding_function=embedding_function,
        )
        
        # Similarity search with scores
        results = vector_store.similarity_search_with_score(query, k=n_results)
        
        print(f"🔍 Search results with scores:")
        for doc, score in results:
            print(f"   Score: {score:.3f} | Source: {doc.metadata.get('source', 'unknown')}")
        
        return results
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return []


if __name__ == "__main__":
    # Test search
    test_query = "What is the objective of the assignment?"
    results = search_documents(test_query, n_results=3)
    
    if results:
        print(f"\n📖 Top result:")
        print(results[0]['content'][:300] + "...")
