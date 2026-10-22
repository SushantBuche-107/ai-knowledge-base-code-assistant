# faiss_server.py
# ------------------
# Flask API for semantic search over a knowledge base with file upload support.
# Knowledge Base entries now have: title, content, filename (for downloadable code files).

import os
import uuid
import json
from typing import List, Dict, Any

import numpy as np
import faiss
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
from sentence_transformers import SentenceTransformer
from openai import OpenAI
import requests
from prompt_templates import build_system_prompt
# ------------------------------------------------------------------------------
# 1. Configuration
# ------------------------------------------------------------------------------
UPLOAD_DIR = "uploaded_files"
os.makedirs(UPLOAD_DIR, exist_ok=True)

DIMENSION = 384  # embedding size for all-MiniLM-L6-v2
from config import DOWNLOAD_BASE_URL, OPENROUTER_BASE_URL, OPENROUTER_API_KEY, EMBEDDING_MODEL_NAME, OPENROUTER_MODEL_NAME


# ✅ Use OpenRouter as backend
client = OpenAI(
    base_url=OPENROUTER_BASE_URL,
    api_key=OPENROUTER_API_KEY,
)
# ------------------------------------------------------------------------------
# 2. Load Sentence Embedding Model
# ------------------------------------------------------------------------------
print(f"Loading embedding model: {EMBEDDING_MODEL_NAME}")
model = SentenceTransformer(EMBEDDING_MODEL_NAME)

# ------------------------------------------------------------------------------
# 3. Load Knowledge Base (if exists)
# ------------------------------------------------------------------------------
knowledge_base_path = "knowledge_base.json"
if os.path.exists(knowledge_base_path):
    with open(knowledge_base_path, "r", encoding="utf-8") as f:
        knowledge_base = json.load(f)
    print(f"Loaded {len(knowledge_base)} entries from {knowledge_base_path}")
else:
    knowledge_base = []
    print("No knowledge_base.json found. Starting with empty KB.")

# ------------------------------------------------------------------------------
# 4. Build FAISS index & vector store
# ------------------------------------------------------------------------------
index = faiss.IndexFlatIP(DIMENSION)
vector_store = []

def rebuild_index():
    """Rebuild FAISS index and vector store from knowledge_base."""
    global index, vector_store
    index = faiss.IndexFlatIP(DIMENSION)
    vector_store = []

    if not knowledge_base:
        print("Knowledge base is empty, nothing to index.")
        return

    texts = [item["content"] for item in knowledge_base]
    embeddings = model.encode(texts, normalize_embeddings=True)

    index.add(np.array(embeddings, dtype="float32"))

    for idx, (kb_item, emb) in enumerate(zip(knowledge_base, embeddings)):
        vector_store.append({
            "id": str(idx),
            "values": emb.tolist(),
            "metadata": {
                "title": kb_item["title"],
                "content": kb_item["content"],
                "filename": kb_item.get("filename")
            }
        })
    print(f"Rebuilt FAISS index. Total entries: {len(vector_store)}")

rebuild_index()

# ------------------------------------------------------------------------------
# 5. Flask App
# ------------------------------------------------------------------------------

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": ["http://localhost:3000", "http://localhost:5173"]}})

# ------------------------------------------------------------------------------
# 6. API Routes
# ------------------------------------------------------------------------------

@app.route("/update_kb", methods=["POST"])
def update_kb() -> Any:
    """
    Add a new entry to the knowledge base and update FAISS index.
    Request: multipart/form-data
    - title: string
    - content: string
    - file: file (code/document to store)
    """
    global knowledge_base, vector_store, index

    title = request.form.get("title")
    content = request.form.get("content")
    file = request.files.get("file")

    if not title or not content or not file:
        return jsonify({"error": "title, content, and file are required"}), 400

    # Save uploaded file
    original_filename = secure_filename(file.filename)
    unique_filename = f"{uuid.uuid4().hex}_{original_filename}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    file.save(file_path)

    # Add entry to knowledge base
    new_entry = {"title": title, "content": content, "filename": unique_filename}
    knowledge_base.append(new_entry)

    # Persist KB to disk
    with open(knowledge_base_path, "w", encoding="utf-8") as f:
        json.dump(knowledge_base, f, indent=2, ensure_ascii=False)

    # Encode embedding for new entry
    embedding = model.encode([content], normalize_embeddings=True)[0]
    index.add(np.array([embedding], dtype="float32"))

    vector_store.append({
        "id": str(len(vector_store)),
        "values": embedding.tolist(),
        "metadata": {
            "title": title,
            "content": content,
            "filename": unique_filename
        }
    })

    return jsonify({"message": "Knowledge base updated successfully"}), 201


@app.route("/search", methods=["POST"])
def search() -> Any:
    """
    Semantic search using a query string.
    Request:
    {
        "query": "Stripe integration"
    }
    """
    query = request.json.get("query", "").strip()
    if not query:
        return jsonify({"error": "Query is required"}), 400

    query_emb = model.encode([query], normalize_embeddings=True)
    scores, ids = index.search(np.array(query_emb, dtype="float32"), k=3)

    results = []
    for score, idx in zip(scores[0], ids[0]):
        entry = vector_store[idx]
        metadata = entry["metadata"].copy()
        if metadata.get("filename"):
            metadata["download_url"] = f"{DOWNLOAD_BASE_URL}/{metadata['filename']}"
        results.append({
            "id": entry["id"],
            "score": float(score),
            "metadata": metadata
        })

    return jsonify(results)


@app.route("/vector_search", methods=["POST"])
def vector_search() -> Any:
    """
    Search by passing embedding vector directly.
    Request:
    {
        "vector": [...],
        "k": 3
    }
    """
    data = request.json
    vector = data.get("vector")
    k = data.get("k", 3)

    if not vector:
        return jsonify({"error": "Vector is required"}), 400

    try:
        query_vec = np.array([vector], dtype="float32")
    except Exception as e:
        return jsonify({"error": f"Invalid vector format: {str(e)}"}), 400

    if query_vec.shape[1] != DIMENSION:
        return jsonify({
            "error": f"Vector dimension mismatch. Expected {DIMENSION}, got {query_vec.shape[1]}"
        }), 400

    scores, ids = index.search(query_vec, k)

    results = []
    for score, idx in zip(scores[0], ids[0]):
        entry = vector_store[idx]
        metadata = entry["metadata"].copy()
        if metadata.get("filename"):
            metadata["download_url"] = f"{DOWNLOAD_BASE_URL}/{metadata['filename']}"
        results.append({
            "id": entry["id"],
            "score": float(score),
            "metadata": metadata
        })

    return jsonify(results)


@app.route("/dump", methods=["GET"])
def dump_index() -> Any:
    """Dump entire vector store (for debugging/admin)."""
    return jsonify(vector_store)


@app.route("/embed", methods=["POST"])
def embed_text() -> Any:
    """
    Generate embedding for given text.
    Request:
    {
        "text": "What is semantic search?"
    }
    """
    text = request.json.get("text", "").strip()
    if not text:
        return jsonify({"error": "Text is required"}), 400

    embedding = model.encode([text], normalize_embeddings=True)[0]
    return jsonify({
        "text": text,
        "embedding_dimension": len(embedding),
        "values": embedding.tolist()
    })

@app.route("/download/<path:filename>", methods=["GET"])
def download_file(filename: str) -> Any:
    """Serve uploaded file for download."""
    return send_from_directory(UPLOAD_DIR, filename, as_attachment=True)

@app.route("/chat", methods=["POST"])
def chat() -> Any:
    """
    Conversational API that uses KB context + OpenRouter LLM.
    Request:
    {
        "query": "Give me twilio voice call code"
    }
    """
    user_query = request.json.get("query", "").strip()
    if not user_query:
        return jsonify({"error": "Query is required"}), 400

    # Step 1: Semantic Search
    query_emb = model.encode([user_query], normalize_embeddings=True)
    scores, ids = index.search(np.array(query_emb, dtype="float32"), k=1)

    if len(ids[0]) == 0:
        return jsonify({"response": "No relevant file found in knowledge base."})

    # Step 2: Get Top Match
    top_idx = ids[0][0]
    entry = vector_store[top_idx]
    metadata = entry["metadata"]

    file_context = ""
    if metadata.get("filename"):
        file_path = os.path.join(UPLOAD_DIR, metadata["filename"])
        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                file_context = f.read()
        except Exception as e:
            file_context = f"Unable to read file: {str(e)}"

    # Step 3: Prepare prompt for LLM
    system_prompt = build_system_prompt(metadata.get('title'), file_context)


    # Step 4: Call OpenRouter
    try:
        completion = client.chat.completions.create(
            extra_headers={
                "HTTP-Referer": "http://localhost:5000",  # adjust for your site
                "X-Title": "Knowledge Base Chat",
            },
            model=OPENROUTER_MODEL_NAME,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_query},
            ],
        )
        response_text = completion.choices[0].message.content
    except Exception as e:
        return jsonify({"error": f"OpenRouter request failed: {str(e)}"}), 500

    return jsonify({
        "response": response_text,
        "file_used": metadata.get("filename"),
        "download_url": f"{DOWNLOAD_BASE_URL}/{metadata['filename']}" if metadata.get("filename") else None,
        "score": float(scores[0][0])
    })
@app.route('/openrouter-key-info', methods=['GET'])
def get_openrouter_key_info() -> Any:
    api_key = OPENROUTER_API_KEY
    if not api_key:
        return jsonify({'error': 'API key not provided'}), 400
    try:
        response = requests.get(
            url=f"{OPENROUTER_BASE_URL}/key",
            headers={
                "Authorization": f"Bearer {api_key}"
            }
        )
        response.raise_for_status()
        return jsonify(response.json())
    except requests.RequestException as e:
        return jsonify({'error': str(e)}), 500
# ------------------------------------------------------------------------------
# 7. Run App
# ------------------------------------------------------------------------------
if __name__ == "__main__":
    # ✅ Run Flask server
    app.run(host="0.0.0.0", port=5000, debug=True)
