/**
 * Turn any API/network error into a short string that is safe to render.
 *
 * FastAPI returns `detail` in two shapes:
 *   - a string            -> HTTPException(detail="...")
 *   - a list of objects   -> request validation errors (HTTP 422)
 * Rendering the list directly in JSX throws, so we flatten it here.
 */
export function getErrorMessage(error, fallback = "Something went wrong.") {
  const detail = error?.response?.data?.detail;

  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }

  if (Array.isArray(detail) && detail.length > 0) {
    return detail
      .map((issue) => {
        const field = Array.isArray(issue.loc)
          ? issue.loc.filter((part) => part !== "body").join(".")
          : "";
        const message = issue.msg || "Invalid value";

        return field ? `${field}: ${message}` : message;
      })
      .join("; ");
  }

  if (error?.code === "ECONNABORTED") {
    return "The request timed out. Please try again.";
  }

  if (error?.request && !error?.response) {
    return "Cannot reach the server. Is the backend running?";
  }

  return error?.message || fallback;
}
