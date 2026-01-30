"""
PDF Loader Module

Extracts text from PDF files page by page.

Key Concept: Document Loaders
------------------------------
Document loaders are responsible for:
1. Reading files in various formats
2. Extracting clean text
3. Preserving metadata (source, page numbers)

Why metadata matters:
- Allows us to cite sources in answers
- Helps users verify information
- Enables filtering by document/page
"""

from pypdf import PdfReader
from langchain_core.documents import Document
from typing import List


def load_pdf(file_path: str) -> List[Document]:
    """
    Load a PDF file and return a list of Documents.
    
    Each page becomes a separate Document object.
    This allows fine-grained retrieval (e.g., "page 5 of contract.pdf")
    
    Args:
        file_path: Path to the PDF file
        
    Returns:
        List of Document objects with page_content and metadata
    """
    documents = []
    
    try:
        reader = PdfReader(file_path)
        print(f"📄 Loading PDF: {file_path} ({len(reader.pages)} pages)")
        
        for i, page in enumerate(reader.pages):
            text = page.extract_text()
            
            if text and text.strip():  # Only add non-empty pages
                documents.append(Document(
                    page_content=text,
                    metadata={
                        "source": file_path,
                        "page": i + 1,
                        "total_pages": len(reader.pages)
                    }
                ))
                
        print(f"   ✅ Extracted {len(documents)} pages")
        
    except Exception as e:
        print(f"   ❌ Error loading PDF {file_path}: {e}")
        # Don't crash - just skip this file
        
    return documents


if __name__ == "__main__":
    # Test with the assignment PDF
    import os
    test_file = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
        "AI_Engineer_Assignment.pdf"
    )
    
    if os.path.exists(test_file):
        docs = load_pdf(test_file)
        if docs:
            print(f"\n📖 Sample content from first page:")
            print(docs[0].page_content[:200] + "...")
