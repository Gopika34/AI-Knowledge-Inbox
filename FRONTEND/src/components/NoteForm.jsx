import { useState } from "react";
import { FileText, LoaderCircle } from "lucide-react";
import { addNote } from "../api/client";

export default function NoteForm({ onSuccess }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();

    setError("");

    if (!content.trim()) {
      setError("Please enter some content.");
      return;
    }

    try {
      setLoading(true);

      await addNote(title.trim(), content.trim());

      setTitle("");
      setContent("");

      onSuccess();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Unable to save your note. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="form-card" onSubmit={handleSubmit}>
      <div className="form-heading">
        <FileText size={22} />
        <div>
          <h3>Save a text note</h3>
          <p>Store useful thoughts and information.</p>
        </div>
      </div>

      <label>Note title</label>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="e.g. Understanding RAG"
        maxLength={255}
      />

      <label>Content</label>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write or paste your knowledge here..."
        rows={8}
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
            Saving and indexing...
          </>
        ) : (
          "Save note"
        )}
      </button>
    </form>
  );
}
