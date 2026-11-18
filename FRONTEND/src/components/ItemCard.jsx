import { FileText, Globe, ExternalLink, Trash2 } from "lucide-react";
import { deleteItem } from "../api/client";
import { useState } from "react";

function formatDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function ItemCard({ item, onDelete }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const isUrl = item.source_type === "url";

  async function handleDelete() {
    if (!window.confirm(`Delete “${item.title}” and its indexed chunks?`)) return;
    setDeleting(true); setError("");
    try { await deleteItem(item.id); onDelete(); } catch { setError("Could not delete this item. Please try again."); setDeleting(false); }
  }

  return (
    <article className="card item-card">
      <div className="item-head">
        <span className={`item-icon ${isUrl ? "is-url" : "is-note"}`}>
          {isUrl ? <Globe size={16} /> : <FileText size={16} />}
        </span>

        <h3 title={item.title}>{item.title || "Untitled"}</h3>

        <span className="badge">{isUrl ? "Webpage" : "Note"}</span>
        <button type="button" className="icon-button delete-button" onClick={handleDelete} disabled={deleting} aria-label={`Delete ${item.title}`} title="Delete item"><Trash2 size={15} /></button>
      </div>

      <p className="item-preview">{item.preview || "No preview available."}</p>

      {error && <p className="form-message error" role="alert">{error}</p>}
      <div className="item-meta">
        <span>{formatDate(item.created_at)}</span>
        <span aria-hidden="true">·</span>
        <span>
          {item.chunk_count} {item.chunk_count === 1 ? "chunk" : "chunks"}
        </span>

        {item.source_url && (
          <a
            href={item.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-link"
          >
            Open original <ExternalLink size={12} />
          </a>
        )}
      </div>
    </article>
  );
}
