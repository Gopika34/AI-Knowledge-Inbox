import re


CHUNK_SIZE = 500
CHUNK_OVERLAP = 80


def clean_text(text: str) -> str:
    """Normalize whitespace without removing paragraph boundaries."""

    text = text.replace("\x00", " ")

    paragraphs = [
        re.sub(r"\s+", " ", paragraph).strip()
        for paragraph in text.splitlines()
    ]

    return "\n\n".join(
        paragraph for paragraph in paragraphs if paragraph
    )


def create_chunks(
    text: str,
    chunk_size: int = CHUNK_SIZE,
    overlap: int = CHUNK_OVERLAP
) -> list[str]:

    if chunk_size <= 0:
        raise ValueError("Chunk size must be positive")

    if overlap < 0 or overlap >= chunk_size:
        raise ValueError("Overlap must be smaller than chunk size")

    words = text.split()

    if not words:
        return []

    chunks = []

    step = chunk_size - overlap

    for start in range(0, len(words), step):
        end = start + chunk_size

        chunk_words = words[start:end]

        if not chunk_words:
            break

        chunks.append(" ".join(chunk_words))

        if end >= len(words):
            break

    return chunks