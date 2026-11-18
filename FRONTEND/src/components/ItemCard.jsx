import {
  FileText,
  Globe,
  CalendarDays,
  Layers,
} from "lucide-react";

export default function ItemCard({ item }) {
  const isUrl = item.source_type === "url";

  return (
    <article className="item-card">
      <div className="item-icon">
        {isUrl ? (
          <Globe size={21} />
        ) : (
          <FileText size={21} />
        )}
      </div>

      <div className="item-content">
        <div className="item-heading">
          <h3>{item.title || "Untitled"}</h3>

          <span className="type-badge">
            {isUrl ? "WEBPAGE" : "NOTE"}
          </span>
        </div>

        <p className="item-preview">
          {item.preview || "No preview available"}
        </p>

        {item.source_url && (
          <a
            href={item.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="source-link"
          >
            Open original webpage
          </a>
        )}

        <div className="item-meta">
          <span>
            <CalendarDays size={14} />
            {new Date(item.created_at).toLocaleDateString()}
          </span>

          <span>
            <Layers size={14} />
            {item.chunk_count} chunks
          </span>
        </div>
      </div>
    </article>
  );
}
