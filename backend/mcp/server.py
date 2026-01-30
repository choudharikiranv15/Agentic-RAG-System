"""
MCP (Model Context Protocol) Server

This module implements a simple MCP-compatible server that exposes
the document search functionality as a tool that AI models can use.

MCP is a protocol for standardizing how AI models interact with external tools.
Learn more: https://modelcontextprotocol.io/

This server exposes:
- search_internal_docs: Search the document database
"""

import json
import sys
from typing import Any, Dict, List

# Add parent directory to path for imports
sys.path.insert(0, str(__file__).rsplit("backend", 1)[0])

from backend.rag.search import search_documents


# MCP Tool Definitions
TOOLS = [
    {
        "name": "search_internal_docs",
        "description": "Search internal documentation for relevant information. Use this tool when you need to find facts, context, or detailed information from uploaded documents.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "The search query to find relevant documents"
                },
                "max_results": {
                    "type": "integer",
                    "description": "Maximum number of results to return (default: 5)",
                    "default": 5
                }
            },
            "required": ["query"]
        }
    }
]


def handle_search_internal_docs(arguments: Dict[str, Any]) -> Dict[str, Any]:
    """
    Handle the search_internal_docs tool call.

    Args:
        arguments: Tool arguments containing 'query' and optionally 'max_results'

    Returns:
        Tool result with search results
    """
    query = arguments.get("query", "")
    max_results = arguments.get("max_results", 5)

    if not query:
        return {
            "isError": True,
            "content": [{"type": "text", "text": "Error: Query cannot be empty"}]
        }

    try:
        results = search_documents(query, n_results=max_results)

        if not results:
            return {
                "content": [{
                    "type": "text",
                    "text": "No relevant documents found for the query."
                }]
            }

        # Format results
        formatted_results = []
        for i, result in enumerate(results, 1):
            content = result['content']
            source = result['metadata'].get('source', 'unknown')
            page = result['metadata'].get('page', '')

            citation = f"[Source: {source}"
            if page:
                citation += f", Page {page}"
            citation += "]"

            formatted_results.append(f"Result {i}:\n{content}\n{citation}")

        return {
            "content": [{
                "type": "text",
                "text": "\n\n---\n\n".join(formatted_results)
            }]
        }

    except Exception as e:
        return {
            "isError": True,
            "content": [{"type": "text", "text": f"Error searching documents: {str(e)}"}]
        }


def handle_request(request: Dict[str, Any]) -> Dict[str, Any]:
    """
    Handle incoming MCP requests.

    Supports:
    - initialize: Initialize the server
    - tools/list: List available tools
    - tools/call: Execute a tool
    """
    method = request.get("method", "")
    request_id = request.get("id")

    if method == "initialize":
        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "result": {
                "protocolVersion": "2024-11-05",
                "capabilities": {
                    "tools": {}
                },
                "serverInfo": {
                    "name": "agentic-rag-mcp",
                    "version": "1.0.0"
                }
            }
        }

    elif method == "tools/list":
        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "result": {
                "tools": TOOLS
            }
        }

    elif method == "tools/call":
        params = request.get("params", {})
        tool_name = params.get("name", "")
        arguments = params.get("arguments", {})

        if tool_name == "search_internal_docs":
            result = handle_search_internal_docs(arguments)
            return {
                "jsonrpc": "2.0",
                "id": request_id,
                "result": result
            }
        else:
            return {
                "jsonrpc": "2.0",
                "id": request_id,
                "error": {
                    "code": -32601,
                    "message": f"Unknown tool: {tool_name}"
                }
            }

    elif method == "notifications/initialized":
        # This is a notification, no response needed
        return None

    else:
        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "error": {
                "code": -32601,
                "message": f"Unknown method: {method}"
            }
        }


def run_stdio_server():
    """
    Run the MCP server using stdio transport.

    This allows the server to be used with Claude Desktop, Cursor, etc.
    """
    print("Agentic RAG MCP Server started (stdio mode)", file=sys.stderr)

    for line in sys.stdin:
        try:
            request = json.loads(line.strip())
            response = handle_request(request)

            if response is not None:
                print(json.dumps(response), flush=True)

        except json.JSONDecodeError as e:
            error_response = {
                "jsonrpc": "2.0",
                "id": None,
                "error": {
                    "code": -32700,
                    "message": f"Parse error: {str(e)}"
                }
            }
            print(json.dumps(error_response), flush=True)
        except Exception as e:
            error_response = {
                "jsonrpc": "2.0",
                "id": None,
                "error": {
                    "code": -32603,
                    "message": f"Internal error: {str(e)}"
                }
            }
            print(json.dumps(error_response), flush=True)


if __name__ == "__main__":
    run_stdio_server()
