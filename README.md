# AI Knowledge Base & Code Assistant

A full-stack application that turns a collection of code files and technical notes into a searchable, AI-assisted knowledge base. It combines semantic search powered by SentenceTransformers and FAISS with an OpenRouter-backed chat assistant that answers questions using the most relevant source file as context.

## Overview

Developers often accumulate reusable snippets, service implementations, and internal documentation across multiple projects. Finding the right piece of code later is slow and error-prone. This project addresses that problem with two integrated capabilities:

1. **Semantic Knowledge Base** — Upload a file together with a title and description. The backend embeds the description with a SentenceTransformers model, stores the vector in a FAISS index, and persists the metadata for future queries.
2. **Context-Aware Code Chat** — Ask a natural-language question. The backend retrieves the closest knowledge-base entry, loads the associated file, and sends it as context to an LLM through OpenRouter to produce a focused, technically accurate answer.

## Key Features

- Semantic search over uploaded code and documentation using cosine similarity.
- FAISS inner-product index for fast nearest-neighbour retrieval.
- File upload and download support with secure, unique filenames.
- AI code assistant that grounds responses in the retrieved source file.
- Vector embed/search endpoints for advanced integrations.
- OpenRouter key usage reporting endpoint.
- Responsive React interface with separate admin, search, and chat views.
- Environment-based configuration with no secrets stored in source control.

## Architecture

```text
┌─────────────────────────────────┐
│  React + TypeScript (Vite)      │
│  Knowledge Base  |  Code Chat   │
└───────────────┬─────────────────┘
                │ REST (JSON / multipart)
┌───────────────▼─────────────────┐
│  Flask API                      │
│  /update_kb  /search  /chat ... │
└───────┬───────────────┬─────────┘
        │               │
┌───────▼──────┐  ┌─────▼──────────────────┐
│ FAISS index  │  │ SentenceTransformers   │
│ + KB storage │  │ all-MiniLM-L6-v2       │
└──────────────┘  └────────────────────────┘
        │
┌───────▼─────────────────────────────────┐
│ OpenRouter LLM (chat responses)         │
└─────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, React Router |
| Backend | Python, Flask, Flask-CORS |
| Embeddings | SentenceTransformers (`all-MiniLM-L6-v2`) |
| Vector Search | FAISS (`faiss-cpu`) |
| LLM Provider | OpenRouter (OpenAI-compatible API) |
| Storage | Local JSON knowledge base and uploaded files |

## Repository Structure

```text
Ai-Project/
├── FlaskServer-dev/
│   └── FlaskServer-dev/          # Flask backend
│       ├── app.py                # API routes and FAISS index
│       ├── config.py             # Environment-based configuration
│       ├── prompt_templates.py   # System prompt construction
│       ├── requirements.txt
│       ├── .env.example
│       └── knowledge_base.example.json
└── ReactApplication-dev/
    └── ReactApplication-dev/     # React frontend
        ├── src/
        │   ├── KnowledgeBase.tsx # Upload and search interface
        │   ├── ChatCode.tsx      # AI code chat interface
        │   └── ...
        ├── package.json
        └── vite.config.ts
```

## Getting Started

### Prerequisites

- Python 3.10 or newer
- Node.js 18 or newer and npm
- An [OpenRouter](https://openrouter.ai/) API key for the chat feature

### 1. Clone the repository

```bash
git clone https://github.com/SushantBuche-107/ai-knowledge-base-code-assistant.git
cd ai-knowledge-base-code-assistant
```

### 2. Set up the backend

```bash
cd FlaskServer-dev/FlaskServer-dev
python -m venv venv
```

Activate the virtual environment:

```powershell
# Windows (PowerShell)
.\venv\Scripts\Activate.ps1
```

```bash
# macOS / Linux
source venv/bin/activate
```

Install dependencies and configure the environment:

```bash
pip install -r requirements.txt
cp .env.example .env
```

Edit `.env` and set `OPENROUTER_API_KEY` to your key, then start the API:

```bash
python app.py
```

The backend runs at `http://localhost:5000`.

### 3. Set up the frontend

In a second terminal:

```bash
cd ReactApplication-dev/ReactApplication-dev
npm install
npm run dev
```

The frontend runs at `http://localhost:5173`.

## Configuration

Configuration is read from environment variables (or a local `.env` file in the backend directory).

| Variable | Default | Description |
| --- | --- | --- |
| `OPENROUTER_API_KEY` | _(none)_ | Required for `/chat` and `/openrouter-key-info` |
| `OPENROUTER_BASE_URL` | `https://openrouter.ai/api/v1` | OpenRouter API base URL |
| `OPENROUTER_MODEL_NAME` | `deepseek/deepseek-chat-v3.1:free` | Model used for chat completions |
| `EMBEDDING_MODEL_NAME` | `all-MiniLM-L6-v2` | SentenceTransformers model |
| `DOWNLOAD_BASE_URL` | `http://localhost:5000/download` | Base URL returned in download links |

Knowledge-base content and uploaded files are stored locally and are intentionally excluded from version control.

## API Reference

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/update_kb` | Add an entry (`title`, `content`, `file`) and index it |
| `POST` | `/search` | Semantic search using `{ "query": "..." }` |
| `POST` | `/vector_search` | Search using a raw embedding vector and optional `k` |
| `POST` | `/embed` | Generate an embedding for `{ "text": "..." }` |
| `POST` | `/chat` | Retrieve the best match and answer via OpenRouter |
| `GET` | `/download/<filename>` | Download an uploaded file |
| `GET` | `/dump` | Inspect the in-memory vector store (debug) |
| `GET` | `/openrouter-key-info` | Report OpenRouter key label, usage, and limits |

Example:

```bash
curl -X POST http://localhost:5000/search \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"stripe integration\"}"
```

## How It Works

1. An admin submits a title, description, and file through `/update_kb`.
2. The description is embedded with SentenceTransformers and added to the FAISS index.
3. Metadata and the saved filename are appended to `knowledge_base.json`.
4. A user searches or asks a question; the query is embedded and matched against the index.
5. For chat requests, the top result's file is read and injected into the system prompt.
6. The prompt and question are sent to the configured OpenRouter model, and the answer is returned with the source filename and download link.

## Security Notes

- No credentials are committed. Provide `OPENROUTER_API_KEY` through your environment or a local `.env` file.
- Uploaded files and the runtime knowledge base are excluded via `.gitignore`.
- File uploads use `secure_filename` and UUID-prefixed names to prevent collisions and path traversal.
- CORS is restricted to the local frontend origins; update `app.py` if you deploy elsewhere.
- For production use, add authentication to the admin upload endpoint, validate file types and sizes, and serve behind HTTPS.

## Author

**Sushant Buche**

- GitHub: [@SushantBuche-107](https://github.com/SushantBuche-107)
