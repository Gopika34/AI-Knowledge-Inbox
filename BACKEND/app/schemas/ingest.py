
from typing import Literal

from pydantic import BaseModel, Field, HttpUrl, ConfigDict, model_validator


class IngestRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    source_type: Literal["note", "url"]

    title: str | None = Field(default=None, max_length=255)

    content: str | None = Field(default=None, max_length=100_000)

    url: HttpUrl | None = None

    @model_validator(mode="after")
    def validate_source(self):
        if self.source_type == "note":
            if not self.content or not self.content.strip():
                raise ValueError("Content is required for a note")

            if self.url is not None:
                raise ValueError("A note cannot contain a URL")

        if self.source_type == "url":
            if self.url is None:
                raise ValueError("URL is required")

            if self.content is not None:
                raise ValueError("A URL item cannot contain note content")

        return self


class IngestResponse(BaseModel):
    id: int
    title: str
    source_type: str
    source_url: str | None
    chunk_count: int
    message: str


class ItemResponse(BaseModel):
    id: int
    title: str
    source_type: str
    source_url: str | None
    created_at: str
    chunk_count: int
    preview: str


class ItemListResponse(BaseModel):
    total: int
    items: list[ItemResponse]