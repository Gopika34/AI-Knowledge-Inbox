from contextlib import asynccontextmanager
import json
import logging
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.database import engine, Base

# Register models before creating tables
from app.llm import models
from app.routes.items import router as items_router
from app.routes.query import router as query_router

class JsonLogFormatter(logging.Formatter):
    """Emit one structured JSON object per log event."""

    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "timestamp": datetime.fromtimestamp(record.created, timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=False)


_handler = logging.StreamHandler()
_handler.setFormatter(JsonLogFormatter())
logging.basicConfig(level=logging.INFO, handlers=[_handler], force=True)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting AI Knowledge Inbox")

    Base.metadata.create_all(bind=engine)

    yield

    logger.info("Shutting down AI Knowledge Inbox")


app = FastAPI(
    title=settings.APP_NAME,
    debug=settings.DEBUG,
    lifespan=lifespan
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()],
    allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Content-Type"],
)


app.include_router(items_router)
app.include_router(query_router)

@app.get("/")
async def root():
    return {
        "message": "Welcome to AI Knowledge Inbox",
        "status": "running"
    }


@app.get("/health")
async def health():
    return {
        "status": "healthy"
    }