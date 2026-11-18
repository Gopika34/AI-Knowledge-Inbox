import asyncio
import pytest

from app.core.config import settings
from app.llm.rag.embeddings import EmbeddingError, generate_embeddings
from app.llm.rag.generation import GenerationError, generate_answer


def test_embedding_fails_cleanly_without_api_key(monkeypatch):
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "")
    with pytest.raises(EmbeddingError, match="not configured"):
        asyncio.run(generate_embeddings(["sample text"]))


def test_generation_fails_cleanly_without_api_key(monkeypatch):
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "")
    with pytest.raises(GenerationError, match="not configured"):
        asyncio.run(generate_answer("question", [{"title": "note", "source_type": "note", "content": "context"}]))


def test_generation_returns_no_context_without_provider_call():
    answer = asyncio.run(generate_answer("question", []))
    assert "couldn't find relevant information" in answer
