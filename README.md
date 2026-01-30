# 🤖 Agentic RAG System

An intelligent document question-answering system powered by AI agents, vector databases, and Large Language Models.

## 🎯 What is This?

This system allows you to:
1. **Upload documents** (PDF, DOCX, PPT, Excel, TXT)
2. **Ask questions** in natural language
3. **Get accurate answers** based on your documents (not made up!)

The system uses **agentic AI** - meaning the AI autonomously decides how to find and synthesize information.

---

## 🏗️ Architecture

```
User Question → ReAct Agent → Retrieval Tool → ChromaDB (Vector DB)
                    ↓
              Gemini LLM → Synthesized Answer with Citations
```

**Key Components:**
- **ChromaDB**: Stores document embeddings for semantic search
- **LangChain**: Orchestrates the agentic workflow
- **Gemini 1.5 Flash**: Powers the AI reasoning
- **ReAct Pattern**: Enables autonomous tool use

---

## 🚀 Quick Start

### 1. Prerequisites
- Python 3.11+
- Google Gemini API Key (free at [makersuite.google.com](https://makersuite.google.com/app/apikey))

### 2. Installation

```bash
# Activate virtual environment
.\venv\Scripts\Activate.ps1  # Windows
# source venv/bin/activate    # Linux/Mac

# Dependencies are already installed!
```

### 3. Configuration

1. Open `.env` file
2. Add your Google API key:
   ```
   GOOGLE_API_KEY=your_actual_key_here
   ```

### 4. Test the System

#### Step 1: Ingest Documents
```bash
# Ingest the assignment PDF
python -m backend.rag.ingest AI_Engineer_Assignment.pdf
```

#### Step 2: Test Search
```bash
# Test similarity search
python -m backend.rag.search
```

#### Step 3: Test the Agent
```bash
# Test the full agentic system
python -m backend.agents.planner
```

---

## 📖 How It Works

### 1. **Document Ingestion**
```python
# backend/rag/ingest.py
File → Load → Chunk (1000 chars) → Embed → Store in ChromaDB
```

**Why chunking?**
- Documents can be huge (100+ pages)
- LLMs have context limits (~8K tokens)
- Smaller chunks = more precise retrieval

### 2. **Semantic Search**
```python
# backend/rag/search.py
Query → Embedding → Similarity Search → Top K chunks
```

**How it works:**
- Converts your question to a vector
- Finds documents with similar vectors
- Returns most relevant chunks

### 3. **Agentic Reasoning (ReAct)**
```python
# backend/agents/planner.py
Question → Thought → Action (search) → Observation → Answer
```

**Example:**
```
Q: "What is the submission deadline?"

Thought: I need to search for deadline info
Action: retrieve_tool("submission deadline")
Observation: [Found: "Submit via email..."]
Thought: I have the answer
Final Answer: "Submit via email with GitHub URL, video, and PDF"
```

---

## 🧪 Testing Guide

### Test 1: ChromaDB Connection
```bash
python -m backend.db.chroma
```
Expected: ✅ ChromaDB initialized

### Test 2: Embeddings
```bash
python -m backend.rag.embed
```
Expected: ✅ Embedding generated (384 or 768 dimensions)

### Test 3: PDF Loading
```bash
python -m backend.loaders.pdf
```
Expected: ✅ Extracted N pages

### Test 4: Full Ingestion
```bash
python -m backend.rag.ingest AI_Engineer_Assignment.pdf
```
Expected: 
- ✅ Loaded PDF
- ✅ Created chunks
- ✅ Stored in ChromaDB

### Test 5: Search
```bash
python -m backend.rag.search
```
Expected: ✅ Found relevant chunks

### Test 6: Agent (Requires API Key!)
```bash
python -m backend.agents.planner
```
Expected: 
- Agent thinks step-by-step
- Uses retrieve_tool
- Provides answer with citations

---

## 📁 Project Structure

```
backend/
├── agents/
│   ├── planner.py      # Main ReAct agent
│   ├── retriever.py    # Search tool wrapper
│   └── validator.py    # Hallucination checker
├── rag/
│   ├── ingest.py       # Document ingestion pipeline
│   ├── embed.py        # Embedding generation
│   └── search.py       # Similarity search
├── loaders/
│   ├── pdf.py          # PDF loader
│   ├── docx.py         # Word loader
│   ├── ppt.py          # PowerPoint loader
│   └── excel.py        # Excel loader
├── db/
│   └── chroma.py       # ChromaDB client
└── main.py             # FastAPI server (coming next!)
```

---

## 🎓 Key Concepts

### What is RAG?
**R**etrieval-**A**ugmented **G**eneration
- Retrieves relevant info from YOUR documents
- Augments the LLM's context with that info
- Generates answers based on retrieved context

### What makes it "Agentic"?
- Traditional: You write if/else logic
- Agentic: LLM decides what to do autonomously
- Uses "tools" (functions) to interact with data

### Why Vector Databases?
- Traditional search: Keyword matching ("car" ≠ "automobile")
- Vector search: Semantic matching ("car" ≈ "automobile")
- Embeddings capture meaning, not just words

---

## 🔧 Troubleshooting

### "GOOGLE_API_KEY not found"
- Create `.env` file
- Add: `GOOGLE_API_KEY=your_key_here`
- Get key at: https://makersuite.google.com/app/apikey

### "No module named 'backend'"
- Make sure you're in the project root
- Run: `python -m backend.rag.ingest` (not `python backend/rag/ingest.py`)

### "Collection is empty"
- You need to ingest documents first
- Run: `python -m backend.rag.ingest <your_file.pdf>`

---

## 📝 Next Steps

- [ ] Build FastAPI backend (Phase 3)
- [ ] Create React frontend (Phase 3)
- [ ] Add MCP server (Bonus)
- [ ] Deploy and create demo video (Phase 4)

---

## 📚 Learn More

- [LangChain Docs](https://python.langchain.com/docs/get_started/introduction)
- [ChromaDB Docs](https://docs.trychroma.com/)
- [Gemini API](https://ai.google.dev/docs)
- [ReAct Paper](https://arxiv.org/abs/2210.03629)

---

Built with ❤️ for AI Engineer Assignment
