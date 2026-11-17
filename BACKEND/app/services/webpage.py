import asyncio
import ipaddress
import socket

from urllib.parse import urlsplit

import httpx
from bs4 import BeautifulSoup


MAX_PAGE_SIZE = 2 * 1024 * 1024


class WebpageFetchError(Exception):
    pass


async def validate_public_url(url: str):
    parsed = urlsplit(url)

    if parsed.scheme not in {"http", "https"}:
        raise WebpageFetchError("Only HTTP and HTTPS URLs are allowed")

    if not parsed.hostname:
        raise WebpageFetchError("Invalid URL hostname")

    if parsed.username or parsed.password:
        raise WebpageFetchError("URLs with credentials are not allowed")

    hostname = parsed.hostname

    if hostname.lower() == "localhost":
        raise WebpageFetchError("Localhost URLs are not allowed")

    try:
        ip = ipaddress.ip_address(hostname)

        if not ip.is_global:
            raise WebpageFetchError("Private IP addresses are not allowed")

    except ValueError:
        try:
            records = await asyncio.to_thread(
                socket.getaddrinfo,
                hostname,
                None,
                type=socket.SOCK_STREAM
            )

            if not records:
                raise WebpageFetchError("Could not resolve hostname")

            for record in records:
                resolved_ip = ipaddress.ip_address(record[4][0])

                if not resolved_ip.is_global:
                    raise WebpageFetchError(
                        "URL resolves to a non-public IP address"
                    )

        except OSError as exc:
            raise WebpageFetchError(
                "Could not resolve the URL hostname"
            ) from exc


async def fetch_webpage(url: str) -> dict:
    await validate_public_url(url)

    headers = {
        "User-Agent": "AIKnowledgeInbox/1.0"
    }

    try:
        async with httpx.AsyncClient(
            timeout=httpx.Timeout(15.0),
            follow_redirects=False
        ) as client:

            async with client.stream(
                "GET",
                url,
                headers=headers
            ) as response:

                if response.status_code in {301, 302, 303, 307, 308}:
                    raise WebpageFetchError(
                        "Redirected URLs are not supported"
                    )

                response.raise_for_status()

                content_type = response.headers.get(
                    "content-type", ""
                ).lower()

                if not any(
                    kind in content_type
                    for kind in ("text/html", "application/xhtml+xml")
                ):
                    raise WebpageFetchError(
                        "The URL must return an HTML webpage"
                    )

                content_length = response.headers.get("content-length")

                if content_length:
                    if int(content_length) > MAX_PAGE_SIZE:
                        raise WebpageFetchError(
                            "Webpage is too large"
                        )

                body = bytearray()

                async for part in response.aiter_bytes():
                    body.extend(part)

                    if len(body) > MAX_PAGE_SIZE:
                        raise WebpageFetchError(
                            "Webpage exceeds the 2 MB limit"
                        )

                html = bytes(body).decode(
                    response.encoding or "utf-8",
                    errors="replace"
                )

    except WebpageFetchError:
        raise

    except httpx.HTTPStatusError as exc:
        raise WebpageFetchError(
            f"Website returned HTTP {exc.response.status_code}"
        ) from exc

    except httpx.TimeoutException as exc:
        raise WebpageFetchError(
            "Website request timed out"
        ) from exc

    except httpx.RequestError as exc:
        raise WebpageFetchError(
            "Could not connect to the website"
        ) from exc

    soup = BeautifulSoup(html, "lxml")

    for element in soup([
        "script",
        "style",
        "nav",
        "footer",
        "header",
        "aside",
        "noscript",
        "svg"
    ]):
        element.decompose()

    title = (
        soup.title.get_text(" ", strip=True)
        if soup.title else "Untitled webpage"
    )

    main_content = soup.find("main") or soup.body or soup

    content = main_content.get_text(
        separator="\n",
        strip=True
    )

    if len(content) < 50:
        raise WebpageFetchError(
            "Could not extract enough readable webpage content"
        )

    return {
        "title": title[:255],
        "content": content
    }