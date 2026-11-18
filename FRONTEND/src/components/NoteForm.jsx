import { useId, useState } from "react";
import { FileText, LoaderCircle } from "lucide-react";

import { addNote } from "../api/client";
import { getErrorMessage } from "../api/errors";

export default function NoteForm({ onSuccess }) {
  const titleId = useId();
  const contentId = useId();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    setError("");
    setSaved(false);

    if (!content.trim()) {
      setError("Please enter some content.");
      return;
    }

    try {
      setLoading(true);

      await addNote(title.trim(), content.trim());

      setTitle("");
      setContent("");
      setSaved(true);

      onSuccess();
    } catch (err) {
      setError(getErrorMessage(err, "Unable to save your note. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="card form-card" onSubmit={handleSubmit}>
      <div className="form-heading">
        <FileText size={18} />
        <div>
          <h2>Text note</h2>
          <p>Paste or write anything you want to be able to ask about later.</p>
        </div>
      </div>

      <label htmlFor={titleId}>
        Title <span className="optional">(optional)</span>
      </label>
      <input
        id={titleId}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="e.g. How vector search works"
        maxLength={255}
      />

      <label htmlFor={contentId}>Content</label>
      <textarea
        id={contentId}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write or paste your note here..."
        rows={8}
      />

      {error && <p className="form-message error" role="alert">{error}</p>}
      {saved && !error && (
        <p className="form-message success" role="status">Note saved and indexed.</p>
      )}

      <button type="submit" className="button button-primary" disabled={loading}>
        {loading ? (
          <>
            <LoaderCircle className="spin" size={16} />
            Saving and indexing...
          </>
        ) : (
          "Save note"
        )}
      </button>
    </form>
  );
}
