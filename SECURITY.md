# Security

This document describes security controls present in the current repository and identifies gaps. It is not a claim of a completed security audit.

## Security posture summary

| Area | Current implementation | Remaining concern |
|---|---|---|
| URL scheme | Only HTTP and HTTPS accepted | HTTP is not encrypted |
| URL credentials | Userinfo in URL rejected | Other URL policy restrictions may be needed |
| Local destinations | Localhost and non-global resolved IPs rejected | DNS rebinding / validation-to-connect gap |
| Redirects | Redirect following disabled; redirect status rejected | Redirect destinations are not revalidated because redirects are not followed |
| Response size | Content-Length checked and streamed body capped at 2 MiB | HTML parsing still consumes memory/CPU within that bound |
| Prompt injection | Retrieved text labelled untrusted; system instruction says not to follow embedded instructions | Model behavior is not a hard security boundary |
| Secrets | Gemini key read by backend settings | Secret rotation and deployment secret manager are operator responsibilities |
| Authentication | None | Do not expose as a multi-user or public private-data service |

## 1. SSRF protection

The webpage import feature makes server-side HTTP requests based on a user-supplied URL. This creates a server-side request forgery (SSRF) risk.

The current fetcher in `BACKEND/app/services/webpage.py` applies these checks:

1. Parses the URL and permits only `http` and `https`.
2. Rejects URLs containing username/password credentials.
3. Rejects `localhost` and names ending in `.localhost`.
4. Resolves hostnames and rejects the request if any resolved address is not globally routable.
5. Rejects literal IP addresses that are not globally routable.
6. Disables redirects (`follow_redirects=False`) and explicitly rejects redirect status codes.
7. Uses a 15-second HTTPX timeout.
8. Sets `trust_env=False`, so ambient proxy environment settings are not used.
9. Accepts only `text/html` and `application/xhtml+xml`.
10. Checks a declared Content-Length and enforces a 2 MiB streamed response-body limit.

These controls reduce common SSRF paths but do not make arbitrary URL fetching risk-free.

## 2. DNS rebinding and connection pinning

The code performs DNS resolution with `socket.getaddrinfo()` during validation. HTTPX subsequently resolves the hostname as part of making the connection. Those are separate operations.

An attacker who controls DNS may be able to return a public address during validation and a private address at connection time. The current code does not pin the HTTP connection to the exact IP address that passed validation.

**Production mitigation:** send outbound webpage requests through a controlled egress proxy that enforces destination IP policy at connection time, or implement a carefully tested custom transport that connects only to the validated address while preserving correct TLS SNI and certificate hostname verification. Revalidate every destination if redirect support is ever introduced. Add network-level egress restrictions as defense in depth.

## 3. Prompt injection and untrusted documents

Imported webpages and saved notes are untrusted input. A document may contain text that attempts to instruct the language model to reveal secrets, ignore system rules, or perform unrelated actions.

The generation system instruction explicitly says that retrieved context is untrusted and that instructions inside retrieved documents must not be followed. It also directs the model to answer only from retrieved context and cite supporting passages.

This is a prompt-level mitigation, not a formal isolation boundary. A model can still produce incorrect output or be influenced by malicious content.

Recommended additional controls:

- Keep tool execution and privileged actions out of the answer-generation path unless separately authorized and constrained.
- Clearly delimit retrieved passages and preserve source provenance.
- Test with adversarial documents and questions as part of regression testing.
- Do not place credentials, internal prompts, or sensitive operational data in retrieved context.
- Treat generated answers as untrusted output and escape them appropriately in the UI.

## 4. Secrets and configuration

`GEMINI_API_KEY` is read by backend settings. It must only exist in the backend environment or a deployment secret manager.

- Never put the Gemini key in `FRONTEND/.env` or any `VITE_` variable.
- Never commit `.env` files or paste secrets into logs.
- Use `.env.example` only as a template; its placeholder is not a usable credential.
- Rotate a key immediately if it is exposed.
- Restrict the key's permissions and quotas where the provider supports it.

The repository's backend settings include `DEBUG` (default `False`), `CORS_ORIGINS`, `GEMINI_CHAT_MODEL`, and `GEMINI_EMBEDDING_MODEL`.

## 5. Authentication and authorization

No authentication or authorization middleware is implemented. The application currently behaves as a single-user workspace: any client that can reach the API can use its endpoints to read, create, query, and delete the shared knowledge base.

Before public or multi-user deployment, implement:

- Authentication with secure session or token handling.
- Authorization checks on every item read, update, delete, and query.
- Per-user ownership on items and chunks, enforced in database queries.
- Rate limits and abuse controls for ingestion and Gemini-backed queries.
- Appropriate CSRF protections if cookie-based browser authentication is introduced.

CORS is not authentication. Restricting browser origins does not prevent non-browser clients from calling the API.

## 6. Data protection

The default SQLite database contains raw notes, imported webpage text, and embeddings. Protect the database file and its backups with filesystem permissions and encrypted storage appropriate to the sensitivity of the content.

The current application does not implement application-level encryption, retention policies, per-user deletion, or audit logging. Deleting an item removes its associated chunks through the ORM relationship cascade; it does not establish secure erasure of filesystem backups or storage media.

## 7. Logging and errors

The FastAPI application configures JSON-formatted logs with timestamp, level, logger, message, and exception details. Avoid adding request bodies, API keys, full private note contents, or authorization headers to logs.

Client-facing errors are generally returned through FastAPI's `detail` field. Do not expose stack traces or secrets in production error responses.

## 8. Deployment checklist

- [ ] Add authentication and authorization before exposing private data.
- [ ] Restrict inbound network access and configure exact CORS origins.
- [ ] Keep Gemini credentials in a secret manager or protected backend environment.
- [ ] Enforce outbound egress policy at connection time to address DNS rebinding.
- [ ] Apply request rate limits and provider cost/usage limits.
- [ ] Use HTTPS for browser-to-API traffic.
- [ ] Protect database files and backups.
- [ ] Review logs for accidental sensitive-data exposure.
- [ ] Test malicious URLs, prompt-injection documents, oversized responses, and invalid payloads.
