import logging

from fastapi import HTTPException
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from app.llm.models import Item, Chunk
from app.schemas.ingest import IngestRequest

from app.llm.rag.chunking import (
    clean_text,
    create_chunks
)

from app.services.webpage import (
    fetch_webpage,
    WebpageFetchError
)

from app.llm.rag.embeddings import (
    generate_embeddings,
    EmbeddingError
)


logger = logging.getLogger(__name__)

MAX_CHUNKS = 100


async def ingest_content(
    request: IngestRequest,
    db: Session
):

    # STEP 1: Prepare the content

    source_url = None

    if request.source_type == "note":

        raw_content = request.content.strip()

        title = (
            request.title.strip()
            if request.title and request.title.strip()
            else next(
                (
                    line.strip()[:255]
                    for line in raw_content.splitlines()
                    if line.strip()
                ),
                "Untitled note"
            )
        )

    else:

        source_url = str(request.url)

        try:
            webpage = await fetch_webpage(source_url)

        except WebpageFetchError as exc:
            raise HTTPException(
                status_code=422,
                detail=str(exc)
            ) from exc

        raw_content = webpage["content"]

        title = (
            request.title.strip()
            if request.title and request.title.strip()
            else webpage["title"]
        )

    # STEP 2: Clean content

    raw_content = clean_text(raw_content)

    if not raw_content:
        raise HTTPException(
            status_code=422,
            detail="No readable content was found"
        )

    # STEP 3: Create chunks

    chunks = create_chunks(raw_content)

    if not chunks:
        raise HTTPException(
            status_code=422,
            detail="Unable to create content chunks"
        )

    if len(chunks) > MAX_CHUNKS:
        raise HTTPException(
            status_code=413,
            detail="Content produces too many chunks"
        )

    # STEP 4: Generate embeddings

    try:
        embeddings = await generate_embeddings(chunks)

    except EmbeddingError as exc:
        raise HTTPException(
            status_code=503,
            detail=str(exc)
        ) from exc

    # STEP 5: Store everything in SQLite

    def persist_records():
        item = Item(title=title, source_type=request.source_type, source_url=source_url, raw_content=raw_content)
        db.add(item)
        db.flush()
        db.add_all([
            Chunk(item_id=item.id, chunk_index=index, content=chunk_text, embedding=embedding)
            for index, (chunk_text, embedding) in enumerate(zip(chunks, embeddings))
        ])
        db.commit()
        db.refresh(item)
        return {"id": item.id, "title": item.title, "source_type": item.source_type,
                "source_url": item.source_url, "chunk_count": len(chunks),
                "message": "Content successfully saved and indexed"}

    try:
        result = await run_in_threadpool(persist_records)
        logger.info("Content ingested successfully: item_id=%s chunks=%s", result["id"], len(chunks))
        return result
    except Exception as exc:
        await run_in_threadpool(db.rollback)
        logger.exception("Database ingestion failed")
        raise HTTPException(status_code=500, detail="Failed to save ingested content") from exc
