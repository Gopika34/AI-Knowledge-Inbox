import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db

from app.schemas.query import (
    QueryRequest,
    QueryResponse,
    SourceCitation
)

from app.llm.rag.retrieval import (
    retrieve_relevant_chunks,
    RetrievalError
)

from app.llm.rag.generation import (
    generate_answer,
    GenerationError
)


logger = logging.getLogger(__name__)

router = APIRouter(
    tags=["AI Knowledge Search"]
)


@router.post(
    "/query",
    response_model=QueryResponse
)
async def query_knowledge(
    request: QueryRequest,
    db: Session = Depends(get_db)
):

    question = request.question.strip()

    if not question:
        raise HTTPException(
            status_code=422,
            detail="Question cannot be empty"
        )

    # STEP 1: Retrieve relevant chunks

    try:

        retrieved_chunks = await retrieve_relevant_chunks(
            question=question,
            db=db,
            top_k=request.top_k
        )

    except RetrievalError as exc:

        raise HTTPException(
            status_code=503,
            detail=str(exc)
        ) from exc

    # STEP 2: Handle missing context

    if not retrieved_chunks:

        return QueryResponse(
            question=question,
            answer=(
                "I couldn't find relevant information "
                "in your saved knowledge to answer this question."
            ),
            sources=[],
            retrieved_count=0
        )

    # STEP 3: Generate grounded answer

    try:

        answer = await generate_answer(
            question=question,
            retrieved_chunks=retrieved_chunks
        )

    except GenerationError as exc:

        raise HTTPException(
            status_code=503,
            detail=str(exc)
        ) from exc

    # STEP 4: Prepare source citations

    citations = []

    for chunk in retrieved_chunks:

        citations.append(
            SourceCitation(
                source_id=chunk["source_id"],
                title=chunk["title"],
                source_type=chunk["source_type"],
                source_url=chunk["source_url"],
                chunk_id=chunk["chunk_id"],
                chunk_index=chunk["chunk_index"],
                snippet=chunk["content"][:300],
                similarity=chunk["similarity"]
            )
        )

    # STEP 5: Return response

    logger.info(
        "Query completed: retrieved=%s",
        len(citations)
    )

    return QueryResponse(
        question=question,
        answer=answer,
        sources=citations,
        retrieved_count=len(citations)
    )
