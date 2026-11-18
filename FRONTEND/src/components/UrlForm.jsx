import { useId, useState } from "react";
import { Globe, LoaderCircle } from "lucide-react";

import { addUrl } from "../api/client";
import { getErrorMessage } from "../api/errors";

export default function UrlForm({ onSuccess }) {
  const urlId = useId();

  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    setError("");
    setSaved(false);

    try {
      const parsed = new URL(url.trim());

      if (!["http:", "https:"].includes(parsed.protocol)) {
        throw new Error("Only HTTP and HTTPS URLs are allowed.");
      }

      setLoading(true);

      await addUrl(url.trim());

      setUrl("");
      setSaved(true);

      onSuccess();
    } catch (err) {
      setError(getErrorMessage(err, "Unable to process this URL."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="card form-card" onSubmit={handleSubmit}>
      <div className="form-heading">
        <Globe size={18} />
        <div>
          <h2>Webpage</h2>
          <p>The server fetches the page and extracts its readable text.</p>
        </div>
      </div>

      <label htmlFor={urlId}>URL</label>
      <input
        id={urlId}
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://example.com/article"
        required
      />

      {error && <p className="form-message error" role="alert">{error}</p>}
      {saved && !error && (
        <p className="form-message success" role="status">Webpage imported and indexed.</p>
      )}

      <button type="submit" className="button button-primary" disabled={loading}>
        {loading ? (
          <>
            <LoaderCircle className="spin" size={16} />
            Fetching and indexing...
          </>
        ) : (
          "Import webpage"
        )}
      </button>
    </form>
  );
}
