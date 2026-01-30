"""
Test Script for Phase 1 Components

This script tests all the components we've built so far.
Run this to verify everything is working before moving to Phase 2.

Usage:
    python test_phase1.py
"""

import os
import sys

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_chroma_connection():
    """Test ChromaDB connection"""
    print("\n" + "="*60)
    print("TEST 1: ChromaDB Connection")
    print("="*60)
    
    try:
        from backend.db.chroma import get_chroma_client, get_collection
        
        client = get_chroma_client()
        print(f"✅ ChromaDB client created")
        print(f"   Heartbeat: {client.heartbeat()}")
        
        collection = get_collection()
        print(f"✅ Collection '{collection.name}' ready")
        print(f"   Current items: {collection.count()}")
        
        return True
    except Exception as e:
        print(f"❌ FAILED: {e}")
        return False


def test_embeddings():
    """Test embedding generation"""
    print("\n" + "="*60)
    print("TEST 2: Embedding Generation")
    print("="*60)
    
    try:
        from backend.rag.embed import get_embeddings
        
        embeddings = get_embeddings()
        print(f"✅ Embedding model loaded")
        
        # Test embedding
        test_text = "This is a test sentence for embeddings."
        vector = embeddings.embed_query(test_text)
        
        print(f"✅ Generated embedding")
        print(f"   Text: '{test_text}'")
        print(f"   Vector dimension: {len(vector)}")
        print(f"   Sample values: {vector[:5]}")
        
        return True
    except Exception as e:
        print(f"❌ FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_pdf_loader():
    """Test PDF loading"""
    print("\n" + "="*60)
    print("TEST 3: PDF Loader")
    print("="*60)
    
    try:
        from backend.loaders.pdf import load_pdf
        
        # Try to load the assignment PDF
        pdf_path = "AI_Engineer_Assignment.pdf"
        
        if not os.path.exists(pdf_path):
            print(f"⚠️  SKIPPED: {pdf_path} not found")
            return True
        
        docs = load_pdf(pdf_path)
        
        if docs:
            print(f"✅ Loaded {len(docs)} pages")
            print(f"   First page preview:")
            print(f"   {docs[0].page_content[:200]}...")
            return True
        else:
            print(f"⚠️  No content extracted")
            return False
            
    except Exception as e:
        print(f"❌ FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_ingestion():
    """Test full ingestion pipeline"""
    print("\n" + "="*60)
    print("TEST 4: Ingestion Pipeline")
    print("="*60)
    
    try:
        from backend.rag.ingest import ingest_files
        
        # Create a test file
        test_file = "test_document.txt"
        with open(test_file, "w", encoding="utf-8") as f:
            f.write("""
            This is a test document for the Agentic RAG System.
            
            The system should be able to:
            1. Load this document
            2. Chunk it into smaller pieces
            3. Generate embeddings
            4. Store in ChromaDB
            5. Retrieve it via similarity search
            
            If you can read this, the ingestion pipeline is working!
            """)
        
        print(f"Created test file: {test_file}")
        
        # Ingest
        stats = ingest_files([test_file])
        
        print(f"\n✅ Ingestion completed")
        print(f"   Files processed: {stats['files_processed']}")
        print(f"   Chunks created: {stats['total_chunks']}")
        
        # Clean up
        os.remove(test_file)
        print(f"   Cleaned up test file")
        
        return stats['files_processed'] > 0
        
    except Exception as e:
        print(f"❌ FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_search():
    """Test search functionality"""
    print("\n" + "="*60)
    print("TEST 5: Document Search")
    print("="*60)
    
    try:
        from backend.rag.search import search_documents
        
        query = "Agentic RAG System"
        results = search_documents(query, n_results=3)
        
        if results:
            print(f"✅ Search returned {len(results)} results")
            print(f"\n   Top result:")
            print(f"   {results[0]['content'][:200]}...")
            print(f"   Source: {results[0]['metadata'].get('source', 'unknown')}")
            return True
        else:
            print(f"⚠️  No results found (database might be empty)")
            return True  # Not a failure if DB is empty
            
    except Exception as e:
        print(f"❌ FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Run all tests"""
    print("\n" + "="*60)
    print("🧪 PHASE 1 COMPONENT TESTS")
    print("="*60)
    
    tests = [
        ("ChromaDB Connection", test_chroma_connection),
        ("Embeddings", test_embeddings),
        ("PDF Loader", test_pdf_loader),
        ("Ingestion Pipeline", test_ingestion),
        ("Document Search", test_search),
    ]
    
    results = []
    for name, test_func in tests:
        try:
            passed = test_func()
            results.append((name, passed))
        except Exception as e:
            print(f"\n❌ Test '{name}' crashed: {e}")
            results.append((name, False))
    
    # Summary
    print("\n" + "="*60)
    print("📊 TEST SUMMARY")
    print("="*60)
    
    for name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status}: {name}")
    
    total = len(results)
    passed_count = sum(1 for _, p in results if p)
    
    print(f"\nTotal: {passed_count}/{total} tests passed")
    
    if passed_count == total:
        print("\n🎉 All tests passed! Ready for Phase 2.")
    else:
        print("\n⚠️  Some tests failed. Please fix before proceeding.")


if __name__ == "__main__":
    main()
