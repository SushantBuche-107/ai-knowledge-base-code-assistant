# config.py
# Configuration values loaded from environment variables.
import os

from dotenv import load_dotenv

load_dotenv()

DOWNLOAD_BASE_URL = os.environ.get(
    "DOWNLOAD_BASE_URL", "http://localhost:5000/download"
)
OPENROUTER_BASE_URL = os.environ.get(
    "OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"
)
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")
EMBEDDING_MODEL_NAME = os.environ.get("EMBEDDING_MODEL_NAME", "all-MiniLM-L6-v2")
OPENROUTER_MODEL_NAME = os.environ.get(
    "OPENROUTER_MODEL_NAME", "deepseek/deepseek-chat-v3.1:free"
)
