import logging

from app.core.config import settings


logger = logging.getLogger(__name__)

EMBEDDING_DIMENSIONS = 768


class EmbeddingError(Exception):
    pass


async def generate_embeddings(
    texts: list[str],
    task_type: str = "RETRIEVAL_DOCUMENT"
) -> list[list[float]]:

    if not texts:
        return []

    if not settings.GEMINI_API_KEY:
        raise EmbeddingError(
            "Gemini API key is not configured"
        )

    from google import genai

    client = genai.Client(
        api_key=settings.GEMINI_API_KEY
    )

    try:
        response = await client.aio.models.embed_content(
            model=settings.GEMINI_EMBEDDING_MODEL,
            contents=texts,
            config={
                "task_type": task_type,
                "output_dimensionality": EMBEDDING_DIMENSIONS
            }
        )

        if not response.embeddings:
            raise EmbeddingError(
                "Gemini returned no embeddings"
            )

        vectors = [
            embedding.values
            for embedding in response.embeddings
        ]

        if len(vectors) != len(texts):
            raise EmbeddingError(
                "Embedding count does not match chunk count"
            )

        for vector in vectors:
            if len(vector) != EMBEDDING_DIMENSIONS:
                raise EmbeddingError(
                    "Unexpected embedding dimensions"
                )

        return vectors

    except EmbeddingError:
        raise

    except Exception as exc:
        logger.exception("Embedding generation failed")

        raise EmbeddingError(
            "Could not generate text embeddings"
        ) from exc

    finally:
        await client.aio.aclose()
