import logging
import math

from sqlalchemy.orm import Session, joinedload

from app.llm.models import Chunk
from app.llm.rag.embeddings import generate_embeddings


logger = logging.getLogger(__name__)

DEFAULT_TOP_K = 5

# Starting threshold only. Calibrate it using your own test queries.
MIN_SIMILARITY = 0.60


class RetrievalError(Exception):
    pass


def cosine_similarity(
    vector_a: list[float],
    vector_b: list[float]
) -> float:

    if len(vector_a) != len(vector_b):
        raise ValueError("Embedding dimensions do not match")

    dot_product = sum(
        a * b for a, b in zip(vector_a, vector_b)
    )

    magnitude_a = math.sqrt(sum(a * a for a in vector_a))
    magnitude_b = math.sqrt(sum(b * b for b in vector_b))

    if magnitude_a == 0 or magnitude_b == 0:
        return 0.0

    return dot_product / (magnitude_a * magnitude_b)


async def retrieve_relevant_chunks(
    question: str,
    db: Session,
    top_k: int = DEFAULT_TOP_K
) -> list[dict]:

    try:
        # 1. Convert question into an embedding

        query_vectors = await generate_embeddings(
            [question],
            task_type="RETRIEVAL_QUERY"
        )

        query_vector = query_vectors[0]

        # 2. Load stored chunks and their parent items

        stored_chunks = (
            db.query(Chunk)
            .options(joinedload(Chunk.item))
            .all()
        )

        if not stored_chunks:
            return []

        # 3. Compare query against every stored embedding

        results = []

        for chunk in stored_chunks:

            similarity = cosine_similarity(
                query_vector,
                chunk.embedding
            )

            results.append({
                "chunk": chunk,
                "similarity": similarity
            })

        # 4. Sort by similarity, highest first

        results.sort(
            key=lambda result: result["similarity"],
            reverse=True
        )

        # 5. Apply initial relevance threshold

        relevant_results = [
            result
            for result in results
            if result["similarity"] >= MIN_SIMILARITY
        ]

        # 6. Return top K results

        selected_results = relevant_results[:top_k]

        logger.info(
            "Semantic retrieval completed: total=%s selected=%s",
            len(stored_chunks),
            len(selected_results)
        )

        output = []

        for result in selected_results:

            chunk = result["chunk"]
            item = chunk.item

            output.append({
                "source_id": item.id,
                "title": item.title,
                "source_type": item.source_type,
                "source_url": item.source_url,
                "chunk_id": chunk.id,
                "chunk_index": chunk.chunk_index,
                "content": chunk.content,
                "similarity": round(
                    result["similarity"], 4
                )
            })

        return output

    except Exception as exc:

        logger.exception("Semantic retrieval failed")

        raise RetrievalError(
            "Unable to retrieve relevant knowledge"
        ) from exc
