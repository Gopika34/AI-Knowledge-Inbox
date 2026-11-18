
import pytest

from app.services.webpage import (
    MAX_PAGE_SIZE,
    WebpageFetchError,
    validate_content_length,
)


@pytest.mark.parametrize(
    "value",
    [
        "abc",
        "-1",
        "1.5",
        "10,20",
        "",
        " ",
    ],
)
def test_rejects_malformed_content_length(value):
    with pytest.raises(WebpageFetchError):
        validate_content_length(value)


def test_accepts_missing_content_length():
    validate_content_length(None)


def test_accepts_valid_content_length():
    validate_content_length("1024")


def test_rejects_content_length_over_limit():
    with pytest.raises(WebpageFetchError):
        validate_content_length(str(MAX_PAGE_SIZE + 1))


def test_accepts_content_length_at_limit():
    validate_content_length(str(MAX_PAGE_SIZE))
