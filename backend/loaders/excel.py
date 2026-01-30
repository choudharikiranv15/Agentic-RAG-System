"""
Excel Loader Module

Extracts data from Excel spreadsheets.

Challenge: Excel contains structured data (rows/columns), not prose.
Solution: Convert each row into a readable text format.
"""

import pandas as pd
from langchain_core.documents import Document
from typing import List


def load_excel(file_path: str) -> List[Document]:
    """
    Load an Excel file and return a list of Documents.
    
    Strategy:
    - Each row becomes a document
    - Format: "Column1: Value1 | Column2: Value2 | ..."
    
    This allows the LLM to understand tabular data as text.
    """
    documents = []
    
    try:
        xls = pd.ExcelFile(file_path)
        print(f"📊 Loading Excel: {file_path} ({len(xls.sheet_names)} sheets)")
        
        for sheet_name in xls.sheet_names:
            df = pd.read_excel(xls, sheet_name=sheet_name)
            print(f"   Sheet '{sheet_name}': {len(df)} rows")
            
            # Convert each row to text
            for index, row in df.iterrows():
                content_parts = []
                
                for col in df.columns:
                    val = row[col]
                    if pd.notna(val):  # Skip empty cells
                        content_parts.append(f"{col}: {val}")
                
                content = " | ".join(content_parts)
                
                if content:
                    documents.append(Document(
                        page_content=content,
                        metadata={
                            "source": file_path,
                            "sheet": sheet_name,
                            "row": int(index) + 2  # +2 because Excel is 1-indexed and has header
                        }
                    ))
                    
        print(f"   ✅ Extracted {len(documents)} rows total")
        
    except Exception as e:
        print(f"   ❌ Error loading Excel {file_path}: {e}")
        
    return documents
