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


def search_documents(query: str, n_results: int = 5, min_score: float = 0.3) -> List[Dict[str, Any]]:
    """
    Search for documents relevant to the query using vector similarity.
    
    Args:
        query: The search query (e.g., "What is the submission deadline?")
        n_results: Number of results to return (default: 5)
        min_score: Minimum similarity score threshold (default: 0.3)
                   Lower scores = less relevant. Range: 0.0 to 1.0
        
    Returns:
        List of dictionaries with 'content' and 'metadata' keys
        
    Example:
        results = search_documents("What is RAG?", n_results=3, min_score=0.4)
        for result in results:
            print(result['content'])
            print(result['metadata']['source'])
    """
    print(f"[SEARCH] Searching for: '{query}'")
    
    try:
        client = get_chroma_client()
        embedding_function = get_embeddings()
        
        vector_store = Chroma(
            client=client,
            collection_name="rag_collection",
            embedding_function=embedding_function,
        )
        
        # Perform similarity search with scores
        results_with_scores = vector_store.similarity_search_with_score(query, k=n_results * 2)
        
        # Filter by minimum score threshold
        # Note: ChromaDB uses distance (lower is better), so we need to convert
        # For L2 distance, we can use: similarity ≈ 1 / (1 + distance)
        filtered_results = []
        for doc, distance in results_with_scores:
            # Convert distance to similarity score (0-1 range)
            similarity = 1 / (1 + distance)
            
            if similarity >= min_score:
                filtered_results.append({
                    "content": doc.page_content,
                    "metadata": doc.metadata,
                    "score": similarity
                })
        
        # Limit to n_results after filtering
        filtered_results = filtered_results[:n_results]
        
        if filtered_results:
            print(f"   [OK] Found {len(filtered_results)} relevant chunks (min score: {min_score:.2f})")
            print(f"   [INFO] Score range: {filtered_results[-1]['score']:.3f} - {filtered_results[0]['score']:.3f}")
        else:
            print(f"   [WARN] No results above threshold {min_score:.2f}")
        
        return filtered_results
        
    except Exception as e:
        print(f"   [ERROR] Error searching documents: {e}")
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
