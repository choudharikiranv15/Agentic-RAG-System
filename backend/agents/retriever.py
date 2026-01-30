"""
Retriever Agent - LangChain Tool

This module wraps our search functionality as a LangChain "tool"
that the agent can use autonomously.

Key Concept: Tools in LangChain
-------------------------------
A "tool" is a function that an LLM can call.

Example conversation:
  LLM: "I need to search for information about deadlines"
  System: *calls retrieve_tool("deadline")*
  Tool: Returns relevant chunks
  LLM: "Based on the search results, the deadline is..."

The @tool decorator makes our function callable by the agent.
"""

from langchain_core.tools import tool
from typing import List, Dict, Any
from backend.rag.search import search_documents


@tool
def retrieve_tool(query: str) -> str:
    """
    Search internal documentation for relevant information.
    
    Use this tool when you need to find facts, context, or detailed 
    information from the uploaded documents.
    
    Args:
        query: The search query (e.g., "What is the submission deadline?")
        
    Returns:
        A formatted string containing relevant document chunks with sources
    """
    # Perform the search
    results = search_documents(query, n_results=5)
    
    if not results:
        return "No relevant documents found for this query."
    
    # Format results for the LLM
    formatted_output = []
    for i, result in enumerate(results, 1):
        content = result['content']
        source = result['metadata'].get('source', 'unknown')
        page = result['metadata'].get('page', '')
        
        # Create a citation
        citation = f"[Source: {source}"
        if page:
            citation += f", Page {page}"
        citation += "]"
        
        formatted_output.append(f"Result {i}:\n{content}\n{citation}")
    
    return "\n\n---\n\n".join(formatted_output)


if __name__ == "__main__":
    # Test the tool
    print("Testing retrieve_tool...")
    result = retrieve_tool.invoke({"query": "What is RAG?"})
    print(result)
