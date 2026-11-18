# API Reference

The API is implemented with FastAPI. Interactive OpenAPI documentation is available at `/docs` while the backend is running.

Base URL for local development: `http://127.0.0.1:8000`.

## Common behavior

- Request and response bodies use JSON unless a route returns `204 No Content`.
- Pydantic validates request fields. Unknown fields are rejected by the ingestion and query request schemas.
- FastAPI validation errors use HTTP `422`.
- CORS origins are configured through `CORS_ORIGINS`.
- No authentication mechanism is implemented.

## `GET /`

Returns a basic welcome/status response.

Example:

```json
{
  "message": "Welcome to AI Knowledge Inbox",
  "status": "running"
}
```

## `GET /health`

Returns an application-level health response.

```json
{
  "status": "healthy"
}
```

This route does not perform dependency checks against the database or Gemini.

## `POST /ingest`

Creates and indexes a note or imports and indexes a webpage. Returns `201 Created`.

### Save a note

Request:

```json
{
  "source_type": "note",
  "title": "Vector search notes",
  "content": "Embeddings represent text as numeric vectors."
}
```

`title` is optional (maximum 255 characters). `content` is required for notes and has a maximum request length of 100,000 characters. If the title is omitted or blank, the first non-empty content line is used, limited to 255 characters; otherwise the fallback title is `Untitled note`.

### Import a webpage

Request:

```json
{
  "source_type": "url",
  "title": "Optional custom title",
  "url": "https://example.com/article"
}
```

`url` is required for URL items. `content` must not be supplied. The backend fetches HTML/XHTML and extracts readable text. Redirect responses are rejected.

### Success response

```json
{
  "id": 12,
  "title": "Vector search notes",
  "source_type": "note",
  "source_url": null,
  "chunk_count": 1,
  "message": "Content successfully saved and indexed"
}
```

### Validation and failure cases

- `422`: invalid source combination, missing required content/URL, invalid URL, unsupported URL scheme, webpage fetch/extraction failure, or empty content.
- `413`: content creates more than 100 chunks. Webpage responses larger than 2 MiB are also rejected by the fetcher and surfaced as an ingestion validation failure (`422`).
- `503`: Gemini embedding service unavailable or API key not configured.
- `500`: database persistence failure.

## `GET /items`

Lists saved items, newest first.

Query parameters:

| Parameter | Default | Constraints | Meaning |
|---|---:|---|---|
| `skip` | `0` | `>= 0` | Number of rows to skip |
| `limit` | `20` | `1–100` | Maximum rows to return |
| `search` | none | 1–200 characters when supplied | Case-insensitive substring match against title or raw content |

Example:

```http
GET /items?skip=0&limit=20&search=vector
```

Response:

```json
{
  "total": 1,
  "items": [
    {
      "id": 12,
      "title": "Vector search notes",
      "source_type": "note",
      "source_url": null,
      "created_at": "2026-11-18T10:30:00+00:00",
      "chunk_count": 1,
      "preview": "Embeddings represent text as numeric vectors."
    }
  ]
}
```

`total` is calculated after applying the optional search filter. `preview` contains the first 200 characters of raw content.

## `GET /items/{item_id}`

Returns one item including its complete raw content.

Example response:

```json
{
  "id": 12,
  "title": "Vector search notes",
  "source_type": "note",
  "source_url": null,
  "raw_content": "Embeddings represent text as numeric vectors.",
  "created_at": "2026-11-18T10:30:00+00:00"
}
```

- `404`: no item exists with the supplied ID.

## `DELETE /items/{item_id}`

Deletes an item. The SQLAlchemy relationship is configured with `cascade="all, delete-orphan"` and the chunk foreign key uses `ON DELETE CASCADE`.

- `204 No Content`: deleted successfully.
- `404`: item does not exist.

## `POST /query`

Answers a question using semantically retrieved saved content.

Request:

```json
{
  "question": "What do my notes say about vector search?",
  "top_k": 5
}
```

- `question`: required string, 3–2,000 characters; the route trims whitespace and rejects an empty result.
- `top_k`: optional integer from 1 to 10; default 5.

### Success response

```json
{
  "question": "What do my notes say about vector search?",
  "answer": "The saved notes describe embeddings as numeric vectors. [S1]",
  "retrieved_count": 1,
  "sources": [
    {
      "source_id": 12,
      "title": "Vector search notes",
      "source_type": "note",
      "source_url": null,
      "chunk_id": 34,
      "chunk_index": 0,
      "snippet": "Embeddings represent text as numeric vectors.",
      "similarity": 0.8123
    }
  ]
}
```

The answer's `[S1]`, `[S2]`, etc. labels refer to the `sources` array in order. Each snippet is truncated to 300 characters.

If no chunks meet the retrieval threshold, the endpoint still returns `200` with an explicit no-context answer, `sources: []`, and `retrieved_count: 0`.

### Query errors

- `422`: invalid request or question.
- `503`: query embedding or answer generation failed.

## Error response shape

FastAPI HTTP exceptions generally return:

```json
{
  "detail": "Human-readable error description"
}
```

Pydantic request validation errors use a structured `detail` array. Clients should not assume `detail` is always a string.

## Notes for API consumers

- There is no login, API token, or user-scoped data access.
- Ingestion waits for fetch, embedding, and database persistence to finish; it is not an asynchronous job API.
- The API does not expose a streaming query endpoint in the current route implementation.
