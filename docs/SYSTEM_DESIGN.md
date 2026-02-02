# Agentic RAG System - System Design Document

**Version:** 1.0
**Author:** Kiran
**Date:** February 2026

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture](#2-system-architecture)
3. [Agentic Workflow Design](#3-agentic-workflow-design)
4. [Data Ingestion Pipeline](#4-data-ingestion-pipeline)
5. [Context Construction Strategy](#5-context-construction-strategy)
6. [Technology Choices & Rationale](#6-technology-choices--rationale)
7. [Key Design Decisions](#7-key-design-decisions)
8. [MCP Integration](#8-mcp-integration)
9. [Limitations & Future Improvements](#9-limitations--future-improvements)

---

## 1. Executive Summary

This document describes the architecture and design decisions for an **Agentic RAG (Retrieval-Augmented Generation) System** that intelligently retrieves and answers questions from multi-format documents. The system combines semantic search, LLM reasoning, and agentic workflows to provide accurate, citation-backed responses.

### Key Capabilities

- Multi-format document ingestion (PDF, DOCX, PPTX, Excel, TXT)
- Semantic vector search using ChromaDB
- Agentic query processing with planning and validation
- Real-time streaming responses via SSE
- MCP Protocol integration for external AI tool connectivity
- Intelligent LLM fallback strategy (Gemini → OpenRouter)

---

## 2. System Architecture

### 2.1 High-Level Architecture Diagram

```mermaid
flowchart TB
    subgraph Client["Client Layer"]
        User([User])
        UI[React Frontend<br/>Tailwind CSS + Framer Motion]
    end

    subgraph API["API Layer"]
        FastAPI[FastAPI Server<br/>:8000]
        RateLimiter[Rate Limiter<br/>5 uploads/min • 20 chats/min]
    end

    subgraph Processing["Processing Layer"]
        direction TB
        subgraph Ingestion["Document Ingestion"]
            Loaders[Multi-Format<br/>Loaders]
            Chunker[Text Splitter<br/>1000 chars • 200 overlap]
            Embedder[HuggingFace<br/>all-MiniLM-L6-v2]
        end

        subgraph Agents["Agentic Workflow"]
            Planner[Planner Agent<br/>Query Orchestration]
            Retriever[Retriever Agent<br/>Document Search]
            Validator[Validator Agent<br/>Hallucination Check]
        end
    end

    subgraph Storage["Storage Layer"]
        ChromaDB[(ChromaDB<br/>Vector Store)]
        LocalStorage[(Browser<br/>localStorage)]
    end

    subgraph External["External Services"]
        Gemini[Google Gemini<br/>2.0 Flash]
        OpenRouter[OpenRouter<br/>Mistral Fallback]
        MCP[MCP Server<br/>stdio Protocol]
    end

    User <--> UI
    UI <--> FastAPI
    FastAPI <--> RateLimiter
    RateLimiter <--> Ingestion
    RateLimiter <--> Agents

    Loaders --> Chunker --> Embedder --> ChromaDB

    Planner <--> Retriever
    Planner <--> Validator
    Retriever <--> ChromaDB

    Planner <--> Gemini
    Planner -.->|fallback| OpenRouter

    UI <--> LocalStorage
    MCP <--> ChromaDB
```

### 2.2 Component Interaction Diagram

```mermaid
flowchart LR
    subgraph Frontend
        ChatUI[Chat Interface]
        Upload[Upload Manager]
        DocList[Document List]
    end

    subgraph Backend
        API["/chat • /upload<br/>/documents • /delete"]

        subgraph RAG[RAG Pipeline]
            Search[Search Module]
            Ingest[Ingest Module]
            Embed[Embed Module]
        end

        subgraph AgentLayer[Agent Layer]
            PA[Planner]
            VA[Validator]
        end
    end

    subgraph Data
        VDB[(Vector DB)]
    end

    ChatUI -->|POST /chat| API
    Upload -->|POST /upload| API
    DocList -->|GET /documents| API

    API --> Search --> VDB
    API --> Ingest --> VDB
    Search --> PA
    PA --> VA
    PA -->|LLM Call| LLM((LLM))
```

---

## 3. Agentic Workflow Design

### 3.1 Query Processing Flow

The system implements a **Plan-Retrieve-Generate-Validate** pattern:

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant A as FastAPI
    participant P as Planner Agent
    participant R as Retriever Agent
    participant V as ChromaDB
    participant L as LLM (Gemini)
    participant Val as Validator Agent

    U->>F: Submit Question
    F->>A: POST /chat {question}
    A->>P: ask_question()

    rect rgb(240, 248, 255)
        Note over P,V: Step 1: Document Retrieval
        P->>R: search_documents(query)
        R->>V: Semantic Search (top-5)
        V-->>R: Relevant Chunks + Metadata
        R-->>P: Formatted Context
    end

    rect rgb(255, 248, 240)
        Note over P,L: Step 2: Answer Generation
        P->>P: Build Prompt with Context
        P->>L: Generate Response
        L-->>P: Answer Text
    end

    rect rgb(240, 255, 240)
        Note over P,Val: Step 3: Validation (Optional)
        P->>Val: validate(answer, context)
        Val-->>P: is_valid, explanation
    end

    P-->>A: {answer, sources, context}
    A-->>F: ChatResponse
    F-->>U: Display with Citations
```

### 3.2 Agent Responsibilities

```mermaid
flowchart TB
    subgraph PlannerAgent["Planner Agent (Orchestrator)"]
        P1[Receive Query]
        P2[Coordinate Retrieval]
        P3[Format Context]
        P4[Select LLM Provider]
        P5[Generate Answer]
        P6[Build Citations]
        P1 --> P2 --> P3 --> P4 --> P5 --> P6
    end

    subgraph RetrieverAgent["Retriever Agent (Tool)"]
        R1[Accept Search Query]
        R2[Generate Query Embedding]
        R3[Vector Similarity Search]
        R4[Filter by Score Threshold]
        R5[Return Ranked Results]
        R1 --> R2 --> R3 --> R4 --> R5
    end

    subgraph ValidatorAgent["Validator Agent (QA)"]
        V1[Receive Answer + Context]
        V2[Fact-Check Against Sources]
        V3[Detect Hallucinations]
        V4[Return Validation Result]
        V1 --> V2 --> V3 --> V4
    end

    PlannerAgent -->|"search_documents()"| RetrieverAgent
    PlannerAgent -->|"validate()"| ValidatorAgent
```

### 3.3 LLM Provider Strategy

```mermaid
flowchart TD
    Start([Query Received]) --> Check{Gemini API<br/>Available?}

    Check -->|Yes| Gemini[Call Gemini 2.0 Flash]
    Gemini --> GeminiOK{Success?}
    GeminiOK -->|Yes| Return([Return Response])
    GeminiOK -->|No| Fallback

    Check -->|No| Fallback[Fallback to OpenRouter]
    Fallback --> OpenRouter[Call Mistral via OpenRouter]
    OpenRouter --> OpenRouterOK{Success?}
    OpenRouterOK -->|Yes| Return
    OpenRouterOK -->|No| Error([Return Error])

    style Gemini fill:#4285F4,color:#fff
    style OpenRouter fill:#FF6B6B,color:#fff
    style Return fill:#34A853,color:#fff
```

| Provider | Model | Use Case | Rate Limit |
|----------|-------|----------|------------|
| **Google Gemini** | `gemini-2.5-flash` | Primary - Best reasoning | Free tier |
| **OpenRouter** | `mistral-nemo` | Fallback - High availability | Pay-per-token |

---

## 4. Data Ingestion Pipeline

### 4.1 Pipeline Architecture

```mermaid
flowchart LR
    subgraph Input["Input Layer"]
        PDF[(PDF)]
        DOCX[(DOCX)]
        PPTX[(PPTX)]
        XLSX[(Excel)]
        TXT[(TXT)]
    end

    subgraph Loading["Loading Stage"]
        PDFLoader[PyPDF<br/>Page-by-page]
        DOCXLoader[python-docx<br/>Full document]
        PPTXLoader[python-pptx<br/>Slide-by-slide]
        XLSXLoader[Pandas<br/>Row-by-row]
        TXTLoader[File Read<br/>Full content]
    end

    subgraph Processing["Processing Stage"]
        Splitter[RecursiveCharacter<br/>TextSplitter]
        MetaEnrich[Metadata<br/>Enrichment]
    end

    subgraph Embedding["Embedding Stage"]
        EmbedModel[all-MiniLM-L6-v2<br/>384 dimensions]
    end

    subgraph Storage["Storage Stage"]
        Chroma[(ChromaDB<br/>Persistent)]
    end

    PDF --> PDFLoader
    DOCX --> DOCXLoader
    PPTX --> PPTXLoader
    XLSX --> XLSXLoader
    TXT --> TXTLoader

    PDFLoader --> Splitter
    DOCXLoader --> Splitter
    PPTXLoader --> Splitter
    XLSXLoader --> Splitter
    TXTLoader --> Splitter

    Splitter --> MetaEnrich --> EmbedModel --> Chroma
```

### 4.2 Document Loader Specifications

| Format | Library | Extraction Strategy | Metadata Captured |
|--------|---------|---------------------|-------------------|
| **PDF** | `pypdf` | One document per page | source, page, total_pages |
| **DOCX** | `python-docx` | All paragraphs joined | source, paragraph_count |
| **PPTX** | `python-pptx` | One document per slide | source, slide_number, total_slides |
| **Excel** | `pandas` | Row as text (`Col: Val \| Col: Val`) | source, sheet_name, row_number |
| **TXT** | Built-in | Full file content | source |

### 4.3 Chunking Strategy

```mermaid
flowchart TD
    Doc[Document Text] --> Split{Split by<br/>Separators}

    Split --> S1["Try: \\n\\n (Paragraphs)"]
    S1 --> Check1{Chunk < 1000?}
    Check1 -->|Yes| Done
    Check1 -->|No| S2["Try: \\n (Lines)"]

    S2 --> Check2{Chunk < 1000?}
    Check2 -->|Yes| Done
    Check2 -->|No| S3["Try: ' ' (Words)"]

    S3 --> Check3{Chunk < 1000?}
    Check3 -->|Yes| Done
    Check3 -->|No| S4["Try: '' (Characters)"]
    S4 --> Done

    Done[Store Chunk<br/>with 200 char overlap]

    style Done fill:#34A853,color:#fff
```

**Configuration:**
```python
RecursiveCharacterTextSplitter(
    chunk_size=1000,      # Maximum characters per chunk
    chunk_overlap=200,    # Overlap to preserve context
    separators=["\n\n", "\n", " ", ""]
)
```

**Rationale:**
- **1000 characters**: Optimal for semantic coherence and LLM context efficiency
- **200 overlap**: Prevents information loss at chunk boundaries
- **Recursive splitting**: Preserves natural document structure (paragraphs → lines → words)

---

## 5. Context Construction Strategy

### 5.1 Retrieval Pipeline

```mermaid
flowchart TB
    Query[User Query] --> Embed[Generate Query<br/>Embedding]
    Embed --> Search[ChromaDB<br/>Similarity Search]
    Search --> Filter[Filter by Score<br/>threshold ≥ 0.3]
    Filter --> Rank[Rank Top-K<br/>Results K=5]
    Rank --> Format[Format with<br/>Source Citations]
    Format --> Context[Augmented<br/>Context]

    subgraph "Similarity Calculation"
        L2[L2 Distance] --> Convert["similarity = 1/(1+distance)"]
    end

    Search --> L2
```

### 5.2 Context Template Structure

```
┌─────────────────────────────────────────────────────────────┐
│                    SYSTEM PROMPT                             │
├─────────────────────────────────────────────────────────────┤
│  You are an expert AI assistant helping users understand    │
│  documents. Provide clear, well-structured answers based    │
│  on the provided context.                                   │
├─────────────────────────────────────────────────────────────┤
│                 CONTEXT FROM DOCUMENTS                       │
├─────────────────────────────────────────────────────────────┤
│  [Source 1: report.pdf, Page 3]                             │
│  <chunk content with semantic relevance>                    │
│                                                             │
│  [Source 2: data.xlsx, Sheet 1, Row 5]                      │
│  <structured data as text>                                  │
│                                                             │
│  [Source 3: slides.pptx, Slide 7]                           │
│  <slide content>                                            │
├─────────────────────────────────────────────────────────────┤
│                    USER QUESTION                             │
├─────────────────────────────────────────────────────────────┤
│  <user's natural language query>                            │
├─────────────────────────────────────────────────────────────┤
│                    INSTRUCTIONS                              │
├─────────────────────────────────────────────────────────────┤
│  1. Answer based ONLY on context provided                   │
│  2. Structure response with bullet points/numbered lists    │
│  3. Reference specific source IDs for citations             │
│  4. If context insufficient, clearly state what's missing   │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 Citation Flow

```mermaid
flowchart LR
    Chunk[Retrieved Chunk] --> Meta[Extract Metadata]
    Meta --> Build[Build Citation]
    Build --> Inject[Inject into Context]
    Inject --> LLM[LLM References<br/>Source IDs]
    LLM --> Display[Frontend Displays<br/>Verified References]

    subgraph "Citation Format"
        CF["[Source: filename.pdf, Page X]"]
    end
```

---

## 6. Technology Choices & Rationale

### 6.1 Technology Stack Overview

```mermaid
mindmap
  root((Agentic RAG<br/>System))
    Frontend
      React 19
      Tailwind CSS
      Framer Motion
      Axios
    Backend
      FastAPI
      Pydantic
      Uvicorn
    Vector DB
      ChromaDB
      Persistent Storage
    Embeddings
      HuggingFace
      all-MiniLM-L6-v2
    LLM
      Google Gemini
      OpenRouter Fallback
    Integration
      MCP Protocol
      SSE Streaming
```

### 6.2 Detailed Rationale

| Component | Technology | Why This Choice | Alternatives Considered |
|-----------|------------|-----------------|------------------------|
| **Frontend** | React + Tailwind | Modern component model, utility-first CSS, excellent DX | Vue, Svelte |
| **Backend** | FastAPI | Async-native, automatic OpenAPI docs, Pydantic validation | Flask, Django |
| **Vector DB** | ChromaDB | Zero-setup, persistent, perfect for < 10k docs | Milvus, Pinecone |
| **Embeddings** | all-MiniLM-L6-v2 | Local (no rate limits), 384D vectors, fast inference | OpenAI Ada, Cohere |
| **Primary LLM** | Gemini 2.0 Flash | State-of-the-art reasoning, massive context window, free tier | GPT-4, Claude |
| **Fallback LLM** | Mistral (OpenRouter) | High availability, cost-effective, good reasoning | Llama, Claude |
| **Streaming** | Server-Sent Events | Native browser support, simple implementation | WebSockets |

### 6.3 Performance Characteristics

| Metric | Value | Notes |
|--------|-------|-------|
| Embedding Latency | ~50ms/chunk | CPU inference, batched |
| Search Latency | ~100ms | Top-5 retrieval |
| LLM Response Time | 1-3s | Gemini, varies by query length |
| Document Ingestion | ~2s/page | Including embedding |

---

## 7. Key Design Decisions

### 7.1 Streaming SSE Architecture

```mermaid
sequenceDiagram
    participant C as Client
    participant S as Server
    participant L as LLM

    C->>S: POST /chat/stream
    S-->>C: event: thinking
    Note over C: Show "AI is thinking..."

    S->>L: Generate Response
    L-->>S: Response Chunks

    S-->>C: event: sources
    Note over C: Display source citations

    S-->>C: event: answer (chunk 1)
    S-->>C: event: answer (chunk 2)
    S-->>C: event: answer (chunk N)
    Note over C: Stream answer text

    S-->>C: event: done
    Note over C: Finalize display
```

**Benefits:**
- Improved perceived performance
- Real-time "thinking" indicators
- Progressive content display
- Better user experience

### 7.2 Multi-Format Ingestion

```mermaid
flowchart TD
    Upload[File Upload] --> Detect{Detect<br/>Format}

    Detect -->|.pdf| PDFHandler[PDF Handler<br/>pypdf]
    Detect -->|.docx| DOCXHandler[DOCX Handler<br/>python-docx]
    Detect -->|.pptx| PPTXHandler[PPTX Handler<br/>python-pptx]
    Detect -->|.xlsx/.xls| ExcelHandler[Excel Handler<br/>pandas]
    Detect -->|.txt| TXTHandler[Text Handler<br/>built-in]

    PDFHandler --> Validate[Validate Content]
    DOCXHandler --> Validate
    PPTXHandler --> Validate
    ExcelHandler --> Validate
    TXTHandler --> Validate

    Validate --> Ingest[Ingest Pipeline]
```

### 7.3 Windows-Optimized Vector Store

**Challenge:** ChromaDB file locks on Windows during database reset

**Solution:**
```python
PersistentClient(
    path="chroma_db/",
    settings=Settings(allow_reset=True)  # Windows-compatible reset
)
```

### 7.4 Modular Architecture

```mermaid
flowchart TB
    subgraph Modules["Pluggable Modules"]
        L[Loaders] -.->|"Swap"| L2[Custom Loader]
        E[Embeddings] -.->|"Swap"| E2[OpenAI/Cohere]
        V[Vector DB] -.->|"Swap"| V2[Milvus/Pinecone]
        LLM[LLM Provider] -.->|"Swap"| LLM2[GPT-4/Claude]
    end

    style L2 fill:#f9f,stroke:#333,stroke-dasharray: 5 5
    style E2 fill:#f9f,stroke:#333,stroke-dasharray: 5 5
    style V2 fill:#f9f,stroke:#333,stroke-dasharray: 5 5
    style LLM2 fill:#f9f,stroke:#333,stroke-dasharray: 5 5
```

**Design Principle:** Each module is independent and can be swapped without affecting others.

---

## 8. MCP Integration

### 8.1 MCP Server Architecture

```mermaid
flowchart LR
    subgraph External["External AI Tools"]
        Claude[Claude Desktop]
        Cursor[Cursor IDE]
        Other[Other MCP Clients]
    end

    subgraph MCPServer["MCP Server (stdio)"]
        Init[initialize]
        List[tools/list]
        Call[tools/call]
    end

    subgraph RAG["RAG System"]
        Search[search_internal_docs]
        VDB[(ChromaDB)]
    end

    Claude <-->|JSON-RPC| MCPServer
    Cursor <-->|JSON-RPC| MCPServer
    Other <-->|JSON-RPC| MCPServer

    Call --> Search --> VDB
```

### 8.2 Exposed MCP Tool

| Tool Name | Description | Parameters |
|-----------|-------------|------------|
| `search_internal_docs` | Search ingested documents | `query` (string), `max_results` (int, default: 5) |

### 8.3 Protocol Flow

```mermaid
sequenceDiagram
    participant Client as MCP Client
    participant Server as MCP Server
    participant DB as ChromaDB

    Client->>Server: initialize
    Server-->>Client: {version, capabilities}

    Client->>Server: tools/list
    Server-->>Client: [search_internal_docs]

    Client->>Server: tools/call {search_internal_docs, query}
    Server->>DB: search_documents()
    DB-->>Server: Results
    Server-->>Client: Formatted Results
```

---

## 9. Limitations & Future Improvements

### 9.1 Current Limitations

```mermaid
flowchart TD
    subgraph Limitations["Known Limitations"]
        L1[No Image/Chart Analysis]
        L2[Single-Tenant Only]
        L3[Scale Limit ~10k docs]
        L4[Sequential Agent Workflow]
        L5[No OCR Support]
    end

    subgraph Impact["Impact"]
        I1[Visual content ignored]
        I2[No user isolation]
        I3[Performance degrades]
        I4[Limited reasoning depth]
        I5[Scanned PDFs fail]
    end

    L1 --> I1
    L2 --> I2
    L3 --> I3
    L4 --> I4
    L5 --> I5
```

| Limitation | Description | Mitigation Path |
|------------|-------------|-----------------|
| **No Image Analysis** | PDFs/PPTs with images only extract text | Integrate VLM (Vision Language Model) |
| **Single-Tenant** | All documents in single collection | Add namespace/user-based collections |
| **Scale Ceiling** | ChromaDB optimal for < 10k files | Migrate to Milvus or Pinecone |
| **Sequential Workflow** | Plan → Retrieve → Generate → Validate | Implement iterative self-correction loops |
| **No OCR** | Scanned documents not supported | Add Tesseract OCR preprocessing |

### 9.2 Future Enhancement Roadmap

```mermaid
timeline
    title Enhancement Roadmap

    section Phase 1
        Multi-tenancy : User namespaces
        OCR Support : Tesseract integration

    section Phase 2
        VLM Integration : Image understanding
        Milvus Migration : Scale to 100k+ docs

    section Phase 3
        Iterative Agents : Self-correction loops
        Hybrid Search : BM25 + Vector fusion
```

### 9.3 Architectural Evolution

```mermaid
flowchart LR
    subgraph Current["Current State"]
        C1[ChromaDB]
        C2[Sequential Agents]
        C3[Text-Only]
    end

    subgraph Future["Future State"]
        F1[Milvus Cluster]
        F2[Multi-Agent Loops]
        F3[Multimodal RAG]
    end

    C1 -->|"Scale"| F1
    C2 -->|"Enhance"| F2
    C3 -->|"Expand"| F3
```

---

## Appendix A: API Endpoints Reference

| Endpoint | Method | Description | Rate Limit |
|----------|--------|-------------|------------|
| `/chat` | POST | Submit question, get answer | 20/min |
| `/chat/stream` | POST | Streaming SSE response | 20/min |
| `/upload` | POST | Upload documents | 5/min |
| `/documents` | GET | List all documents | None |
| `/delete/{filename}` | DELETE | Remove document | None |
| `/clear` | POST | Clear all data | None |
| `/health` | GET | Health check | None |

---

## Appendix B: Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_API_KEY` | Yes | Gemini API key |
| `OPENROUTER_API_KEY` | Optional | Fallback LLM provider |

---

**Document End**

*This system design demonstrates thoughtful consideration of agentic workflows, data engineering, and production-ready architecture for an intelligent document Q&A system.*
