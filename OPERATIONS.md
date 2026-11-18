# Operations

This guide describes the current runtime configuration and practical operating procedures. Deployment examples are starting points; the repository does not include a Dockerfile, Compose file, process manager configuration, CI pipeline, migration scripts, or backup automation.

## 1. Runtime requirements

- Python environment with dependencies from `BACKEND/requirements.txt`.
- Node.js/npm for building and serving the frontend.
- Gemini API key for embedding and answer-generation features.
- Writable persistent storage for the database when using the default SQLite configuration.

## 2. Environment variables

### Backend

| Variable | Default | Purpose |
|---|---|---|
| `APP_NAME` | `AI Knowledge Inbox` | FastAPI application title |
| `DEBUG` | `false` | FastAPI debug setting |
| `CORS_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Comma-separated allowed browser origins |
| `GEMINI_API_KEY` | empty | Gemini API credential; required for embeddings and generation |
| `GEMINI_CHAT_MODEL` | `gemini-3.1-flash-lite` | Gemini generation model |
| `GEMINI_EMBEDDING_MODEL` | `gemini-embedding-001` | Gemini embedding model |
| `DATABASE_URL` | SQLite file under `BACKEND/app/knowledge_inbox.db` | SQLAlchemy database connection URL |

Backend settings are loaded through Pydantic Settings with `.env` support. The database URL is read directly from the process environment in `app/db/database.py`.

Example `BACKEND/.env`:

```dotenv
GEMINI_API_KEY=replace_with_your_key
GEMINI_CHAT_MODEL=gemini-3.1-flash-lite
GEMINI_EMBEDDING_MODEL=gemini-embedding-001
CORS_ORIGINS=http://localhost:5173
DEBUG=false
```

Do not commit this file.

### Frontend

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | `http://127.0.0.1:8000` | Backend API base URL |

Only public configuration belongs in frontend environment variables. Never place `GEMINI_API_KEY` or other secrets in a `VITE_` variable.

## 3. Local startup

### Backend

```bash
cd BACKEND
python -m venv .venv
# Activate the environment for your shell
pip install -r requirements.txt
# Create .env from .env.example and configure GEMINI_API_KEY
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

For local development, add `--reload`. For a deployment, bind to the interface required by the hosting platform and place the service behind an HTTPS-capable reverse proxy or platform ingress.

The application creates database tables during FastAPI startup using SQLAlchemy metadata.

### Frontend

```bash
cd FRONTEND
npm install
npm run build
```

The build output is produced by Vite. The repository does not prescribe a production static-file server; deploy the generated assets using your chosen web server or hosting platform and set `VITE_API_BASE_URL` at build time as appropriate.

## 4. Persistent storage

By default, the database file is:

```text
BACKEND/app/knowledge_inbox.db
```

Set `DATABASE_URL` to use a different SQLAlchemy database URL. For SQLite, mount the directory containing the database file on durable storage and ensure the application process can read and write it.

Do not store the SQLite database on an ephemeral container filesystem if saved knowledge must survive restarts or redeployments.

## 5. Backups and restore

There is no backup scheduler or restore command in the application. Operators must provide and test backups.

For SQLite deployments:

1. Prefer SQLite's online backup mechanism or stop writes before copying the database file.
2. Store backups outside the application container and restrict access.
3. Encrypt backups when they contain private notes or imported content.
4. Define retention and deletion policies.
5. Periodically test restoring a backup into an isolated environment.

A raw file copy while SQLite is actively writing may not be a reliable backup procedure. Include the database and any other durable state required by the deployment.

## 6. Health checks and monitoring

Available endpoints:

- `GET /`: returns a welcome message and `status: running`.
- `GET /health`: returns `status: healthy`.

The current health endpoint is a lightweight application response; it does not test database queries, Gemini API availability, or end-to-end retrieval.

The application emits JSON-formatted logs to standard output with timestamp, severity, logger name, message, and exception details. Capture stdout/stderr using the hosting platform's log collector.

Recommended production monitoring:

- HTTP request count, latency, and status codes.
- Ingestion success/failure rates and duration.
- Gemini embedding/generation errors, latency, quotas, and cost.
- Database availability, disk space, backup age, and restore-test results.
- Number of stored items/chunks and retrieval latency.
- Alerts for repeated 5xx responses, provider failures, and storage exhaustion.

Avoid logging API keys or full private document content.

## 7. Scaling considerations

Current bottlenecks and constraints:

- Retrieval loads every chunk and computes cosine similarity in Python, so query work grows linearly with corpus size.
- Embeddings are stored as JSON, not in a vector index.
- Ingestion runs in the HTTP request lifecycle and waits for fetching, embedding, and persistence.
- There is no queue, cache, distributed worker, or persistent chat history.
- SQLite is suitable for modest single-user use but may not suit high write concurrency or multi-instance deployments.

Potential evolution path:

1. Add request limits, authentication, and observability.
2. Introduce background ingestion jobs with retries and visible job status.
3. Use PostgreSQL for stronger concurrent access and operational tooling.
4. Add pgvector or a dedicated vector store when corpus size justifies indexed similarity search.
5. Add migrations and a deployment health/readiness strategy.
6. Load-test retrieval and provider usage before increasing concurrency.

## 8. Troubleshooting

| Symptom | Checks |
|---|---|
| Backend starts but ingest/query returns provider errors | Confirm `GEMINI_API_KEY`, model names, provider access, quota, and network connectivity |
| Frontend cannot reach API | Confirm backend is running, `VITE_API_BASE_URL` is correct, and `CORS_ORIGINS` includes the frontend origin |
| URL ingestion fails | Confirm the URL is public, returns HTML/XHTML, does not redirect, resolves only to public IPs, and is below the 2 MiB response limit |
| Query returns no-context answer | Confirm content was ingested; try a question closer to the saved wording; review retrieval threshold and embedding availability |
| Data disappears after redeploy | Confirm the SQLite database directory is mounted on persistent storage and is included in backup procedures |
| Slow query as corpus grows | Retrieval currently scores all chunks; measure chunk count and consider a vector index |

## 9. Release checklist

- [ ] Configure secrets outside source control.
- [ ] Set production CORS origins explicitly.
- [ ] Add authentication and authorization before public exposure.
- [ ] Use HTTPS and restrict inbound/outbound network access.
- [ ] Ensure database storage is durable.
- [ ] Verify backups and perform a restore test.
- [ ] Run backend tests, frontend lint, and frontend build.
- [ ] Confirm logs and monitoring are collected.
- [ ] Review provider quotas, costs, and rate limits.
- [ ] Test health, ingestion, listing, deletion, and question-answering flows.
