from pydantic import BaseModel, Field, ConfigDict


class QueryRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    question: str = Field(
        min_length=3,
        max_length=2000
    )

    top_k: int = Field(
        default=5,
        ge=1,
        le=10
    )


class SourceCitation(BaseModel):
    source_id: int
    title: str
    source_type: str
    source_url: str | None = None
    chunk_id: int
    chunk_index: int
    snippet: str
    similarity: float


class QueryResponse(BaseModel):
    question: str
    answer: str
    sources: list[SourceCitation]
    retrieved_count: int