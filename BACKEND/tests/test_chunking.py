from app.llm.rag.chunking import create_chunks, clean_text


def test_empty_content():
    assert create_chunks("") == []


def test_single_chunk():
    text = " ".join(["RAG"] * 100)

    chunks = create_chunks(text)

    assert len(chunks) == 1


def test_chunk_size():
    text = " ".join(["word"] * 1200)

    chunks = create_chunks(text)

    assert all(len(chunk.split()) <= 500 for chunk in chunks)


def test_chunk_overlap():
    words = [f"word{i}" for i in range(1000)]

    chunks = create_chunks(" ".join(words))

    first = chunks[0].split()
    second = chunks[1].split()

    assert first[-80:] == second[:80]


def test_all_content_is_preserved():
    words = [f"word{i}" for i in range(1200)]

    chunks = create_chunks(" ".join(words))

    reconstructed = set(
        word
        for chunk in chunks
        for word in chunk.split()
    )

    assert reconstructed == set(words)


def test_invalid_chunk_configuration():
    import pytest

    with pytest.raises(ValueError):
        create_chunks("some text", chunk_size=100, overlap=100)


def test_clean_text():
    result = clean_text("Hello     world\n\n   This is RAG.")

    assert result == "Hello world\n\nThis is RAG."