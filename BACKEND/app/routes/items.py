import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.llm.models import Item, Chunk

from app.schemas.ingest import (
    IngestRequest,
    IngestResponse,
    ItemListResponse
)

from app.llm.rag.ingestion import ingest_content


logger = logging.getLogger(__name__)

router = APIRouter(
    tags=["Knowledge Inbox"]
)


@router.post(
    "/ingest",
    response_model=IngestResponse,
    status_code=201
)
async def ingest(
    request: IngestRequest,
    db: Session = Depends(get_db)
):

    return await ingest_content(request, db)


@router.get(
    "/items",
    response_model=ItemListResponse
)
def get_items(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None, min_length=1, max_length=200),
    db: Session = Depends(get_db)
):

    query = db.query(Item)
    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter((Item.title.ilike(term)) | (Item.raw_content.ilike(term)))
    total = query.count()

    items = (
        query.order_by(Item.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    results = []

    for item in items:

        chunk_count = (
            db.query(Chunk)
            .filter(Chunk.item_id == item.id)
            .count()
        )

        results.append({
            "id": item.id,
            "title": item.title,
            "source_type": item.source_type,
            "source_url": item.source_url,
            "created_at": item.created_at.isoformat(),
            "chunk_count": chunk_count,
            "preview": item.raw_content[:200]
        })

    return {
        "total": total,
        "items": results
    }


@router.get("/items/{item_id}")
def get_item(
    item_id: int,
    db: Session = Depends(get_db)
):

    item = db.query(Item).filter(
        Item.id == item_id
    ).first()

    if not item:
        raise HTTPException(
            status_code=404,
            detail="Knowledge item not found"
        )

    return {
        "id": item.id,
        "title": item.title,
        "source_type": item.source_type,
        "source_url": item.source_url,
        "raw_content": item.raw_content,
        "created_at": item.created_at.isoformat()
    }

@router.delete("/items/{item_id}", status_code=204)
def delete_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(Item).filter(Item.id == item_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Knowledge item not found")
    db.delete(item)
    db.commit()
    logger.info("Knowledge item deleted: item_id=%s", item_id)
    return None
