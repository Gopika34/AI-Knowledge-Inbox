import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.database import Base, get_db
from app.main import app
from app.llm.models import Item, Chunk


@pytest.fixture
def client():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    def override_get_db():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    test_client = TestClient(app)
    yield test_client
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


def test_items_search_and_pagination(client):
    db_gen = app.dependency_overrides[get_db]()
    db = next(db_gen)
    db.add_all([
        Item(title="Alpha guide", source_type="note", raw_content="A searchable alpha note"),
        Item(title="Beta guide", source_type="note", raw_content="A beta note"),
    ])
    db.commit()
    db.close()

    response = client.get("/items", params={"skip": 0, "limit": 1})
    assert response.status_code == 200
    assert response.json()["total"] == 2
    assert len(response.json()["items"]) == 1

    searched = client.get("/items", params={"search": "alpha"})
    assert searched.status_code == 200
    assert searched.json()["total"] == 1
    assert searched.json()["items"][0]["title"] == "Alpha guide"


def test_delete_item_and_not_found(client):
    db_gen = app.dependency_overrides[get_db]()
    db = next(db_gen)
    item = Item(title="Delete me", source_type="note", raw_content="Some text")
    db.add(item)
    db.flush()
    db.add(Chunk(item_id=item.id, chunk_index=0, content="Some text", embedding=[0.1, 0.2]))
    db.commit()
    item_id = item.id
    db.close()

    response = client.delete(f"/items/{item_id}")
    assert response.status_code == 204
    assert client.delete(f"/items/{item_id}").status_code == 404


def test_ingest_validation_rejects_extra_fields(client):
    response = client.post("/ingest", json={"source_type": "note", "content": "valid content", "unexpected": True})
    assert response.status_code == 422


def test_ingest_endpoint_returns_created_item(client, monkeypatch):
    async def fake_ingest(_request, _db):
        return {
            "id": 41,
            "title": "API test note",
            "source_type": "note",
            "source_url": None,
            "chunk_count": 2,
            "message": "Content successfully saved and indexed",
        }

    monkeypatch.setattr("app.routes.items.ingest_content", fake_ingest)
    response = client.post("/ingest", json={"source_type": "note", "content": "A useful note for testing"})
    assert response.status_code == 201
    assert response.json()["id"] == 41
    assert response.json()["chunk_count"] == 2


def test_query_endpoint_returns_cited_sources(client, monkeypatch):
    async def fake_retrieve(**_kwargs):
        return [{
            "source_id": 7,
            "title": "Test source",
            "source_type": "note",
            "source_url": None,
            "chunk_id": 9,
            "chunk_index": 0,
            "content": "The saved note says the answer is 42.",
            "similarity": 0.83,
        }]

    async def fake_generate(**_kwargs):
        return "The answer is 42 [S1]."

    monkeypatch.setattr("app.routes.query.retrieve_relevant_chunks", fake_retrieve)
    monkeypatch.setattr("app.routes.query.generate_answer", fake_generate)
    response = client.post("/query", json={"question": "What is the answer?", "top_k": 3})
    assert response.status_code == 200
    payload = response.json()
    assert payload["answer"] == "The answer is 42 [S1]."
    assert payload["retrieved_count"] == 1
    assert payload["sources"][0]["chunk_id"] == 9


def test_query_endpoint_returns_no_context_without_sources(client, monkeypatch):
    async def fake_retrieve(**_kwargs):
        return []

    monkeypatch.setattr("app.routes.query.retrieve_relevant_chunks", fake_retrieve)
    response = client.post("/query", json={"question": "What is not in my notes?"})
    assert response.status_code == 200
    assert response.json()["sources"] == []
    assert response.json()["retrieved_count"] == 0
