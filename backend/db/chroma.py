"""
ChromaDB Client Module

This module manages the connection to ChromaDB, our vector database.

Key Concepts:
- Vector Database: Stores text as mathematical vectors (embeddings)
- Embeddings: Numerical representations of text that capture semantic meaning
- Collection: A group of documents with their embeddings (like a table in SQL)

Why ChromaDB?
- Simple setup (no Docker required)
- Persistent storage (data survives restarts)
- Fast similarity search
"""

import chromadb
from chromadb.config import Settings
import os

# Define the persistence directory - where ChromaDB stores its data
# We store it at the project root level
CHROMA_DB_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 
    "chroma_db"
)

def get_chroma_client():
    """
    Returns a persistent ChromaDB client.
    
    Persistent means: Data is saved to disk and survives program restarts.
    This is crucial for a production system.
    """
    os.makedirs(CHROMA_DB_DIR, exist_ok=True)
    return chromadb.PersistentClient(
        path=CHROMA_DB_DIR,
        settings=Settings(allow_reset=True)
    )


def get_collection(name="rag_collection", embedding_function=None):
    """
    Returns a collection from the ChromaDB client.
    
    A collection is like a "table" in SQL - it holds related documents.
    
    Args:
        name: Collection name
        embedding_function: The function that converts text to vectors
    """
    client = get_chroma_client()
    return client.get_or_create_collection(
        name=name, 
        embedding_function=embedding_function
    )


if __name__ == "__main__":
    # Test connection
    try:
        client = get_chroma_client()
        print(f"✅ ChromaDB initialized at: {CHROMA_DB_DIR}")
        print(f"✅ Heartbeat: {client.heartbeat()}")
        
        col = get_collection()
        print(f"✅ Collection '{col.name}' ready with {col.count()} items.")
    except Exception as e:
        print(f"❌ Error initializing ChromaDB: {e}")
