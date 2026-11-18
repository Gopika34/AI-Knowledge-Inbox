
import { useState } from "react";
import { Globe, LoaderCircle } from "lucide-react";
import { addUrl } from "../api/client";

export default function UrlForm({ onSuccess }) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();

    setError("");

    try {
      const parsed = new URL(url);

      if (!["http:", "https:"].includes(parsed.protocol)) {
        throw new Error("Only HTTP and HTTPS URLs are allowed.");
      }

      setLoading(true);

      await addUrl(url.trim());

      setUrl("");
      onSuccess();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        err.message ||
        "Unable to process this URL."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="form-card" onSubmit={handleSubmit}>
      <div className="form-heading">
        <Globe size={22} />
        <div>
          <h3>Save a webpage</h3>
          <p>Import content from an online article or website.</p>
        </div>
      </div>

      <label>Website URL</label>

      <input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://example.com/article"
        required
      />

      {error && <p className="error-message">{error}</p>}

      <button
        type="submit"
        className="primary-button"
        disabled={loading}
      >
        {loading ? (
          <>
            <LoaderCircle className="spin" size={18} />
            Fetching and indexing...
          </>
        ) : (
          "Import webpage"
        )}
      </button>
    </form>
  );
}
