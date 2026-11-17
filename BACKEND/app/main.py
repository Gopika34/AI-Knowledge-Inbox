from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.database import engine, Base

# Register models before creating tables
from app.llm import models
from app.routes.items import router as items_router


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s"
)

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
    allow_origins=[
        "http://localhost:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

app.include_router(items_router)

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