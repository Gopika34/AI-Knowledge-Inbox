
import asyncio
import ipaddress
import re
import socket
from urllib.parse import urlsplit

import httpx
from bs4 import BeautifulSoup


MAX_PAGE_SIZE = 2 * 1024 * 1024
REQUEST_TIMEOUT = httpx.Timeout(15.0)


class WebpageFetchError(Exception):
    pass


async def validate_public_url(url: str) -> None:
    try:
        parsed = urlsplit(url)
        hostname = parsed.hostname
        port = parsed.port
    except ValueError as exc:
        raise WebpageFetchError("Invalid URL") from exc

    if parsed.scheme.lower() not in {"http", "https"}:
        raise WebpageFetchError(
            "Only HTTP and HTTPS URLs are allowed"
        )

    if not hostname:
        raise WebpageFetchError("Invalid URL hostname")

    if parsed.username is not None or parsed.password is not None:
        raise WebpageFetchError(
            "URLs with credentials are not allowed"
        )

    hostname = hostname.rstrip(".").lower()

    if hostname == "localhost" or hostname.endswith(".localhost"):
        raise WebpageFetchError("Localhost URLs are not allowed")

    try:
        ip = ipaddress.ip_address(hostname)
    except ValueError:
        ip = None

    if ip is not None:
        if not ip.is_global:
            raise WebpageFetchError(
                "Non-public IP addresses are not allowed"
            )
        return

    try:
        records = await asyncio.to_thread(
            socket.getaddrinfo,
            hostname,
            port or (443 if parsed.scheme == "https" else 80),
            type=socket.SOCK_STREAM,
        )
    except OSError as exc:
        raise WebpageFetchError(
            "Could not resolve the URL hostname"
        ) from exc

    if not records:
        raise WebpageFetchError("Could not resolve hostname")

    resolved_ips = set()

    for record in records:
        try:
            resolved_ip = ipaddress.ip_address(
                record[4][0].split("%", 1)[0]
            )
        except ValueError as exc:
            raise WebpageFetchError(
                "Hostname resolved to an invalid IP"
            ) from exc

        resolved_ips.add(resolved_ip)

    if any(not ip.is_global for ip in resolved_ips):
        raise WebpageFetchError(
            "URL resolves to a non-public IP address"
        )


def validate_content_length(value: str | None) -> None:
    if value is None:
        return

    value = value.strip()

    if not value or re.fullmatch(r"[0-9]+", value) is None:
        raise WebpageFetchError(
            "Website returned an invalid Content-Length"
        )

    declared_size = int(value)

    if declared_size > MAX_PAGE_SIZE:
        raise WebpageFetchError("Webpage is too large")


async def fetch_webpage(url: str) -> dict:
    await validate_public_url(url)

    headers = {
        "User-Agent": "AIKnowledgeInbox/1.0"
    }

    try:
        async with httpx.AsyncClient(
            timeout=REQUEST_TIMEOUT,
            follow_redirects=False,
            trust_env=False,
        ) as client:

            async with client.stream(
                "GET",
                url,
                headers=headers,
            ) as response:

                if response.status_code in {
                    301, 302, 303, 307, 308
                }:
                    raise WebpageFetchError(
                        "Redirected URLs are not supported"
                    )

                response.raise_for_status()

                content_type = response.headers.get(
                    "content-type", ""
                ).lower()

                media_type = content_type.split(
                    ";", 1
                )[0].strip()

                if media_type not in {
                    "text/html",
                    "application/xhtml+xml",
                }:
                    raise WebpageFetchError(
                        "The URL must return an HTML webpage"
                    )

                validate_content_length(
                    response.headers.get("content-length")
                )

                body = bytearray()

                async for part in response.aiter_bytes():
                    if len(body) + len(part) > MAX_PAGE_SIZE:
                        raise WebpageFetchError(
                            "Webpage exceeds the 2 MB limit"
                        )

                    body.extend(part)

                encoding = response.encoding or "utf-8"

                try:
                    html = bytes(body).decode(
                        encoding,
                        errors="replace",
                    )
                except LookupError:
                    html = bytes(body).decode(
                        "utf-8",
                        errors="replace",
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
        "svg",
    ]):
        element.decompose()

    title = (
        soup.title.get_text(" ", strip=True)
        if soup.title
        else "Untitled webpage"
    )

    main_content = soup.find("main") or soup.body or soup

    content = main_content.get_text(
        separator="\n",
        strip=True,
    )

    if len(content) < 50:
        raise WebpageFetchError(
            "Could not extract enough readable webpage content"
        )

    return {
        "title": title[:255],
        "content": content,
    }
