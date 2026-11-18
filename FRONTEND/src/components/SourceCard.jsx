import { FileText, Globe, ExternalLink } from "lucide-react";

export default function SourceCard({ source, index }) {
  const isUrl = source.source_type === "url";
  const similarity = Number.isFinite(Number(source.similarity))
    ? Math.max(0, Math.min(100, Number(source.similarity) * 100))
    : null;

  return (
    <article className="source-card" id={`source-${source.chunk_id}`}>
      <div className="source-head">
        <span className="cite-chip">{index + 1}</span>
        <span className={`source-type-icon ${isUrl ? "is-url" : "is-note"}`}>
          {isUrl ? <Globe size={14} /> : <FileText size={14} />}
        </span>
        <div className="source-title-wrap">
          <strong className="source-title" title={source.title}>
            {source.title || "Untitled source"}
          </strong>
          <span className="source-type-label">{isUrl ? "WEBPAGE" : "NOTE"}</span>
        </div>
        {similarity !== null && (
          <span className="source-score" title="Cosine similarity to your question">
            {similarity.toFixed(0)}% match
          </span>
        )}
      </div>

      {similarity !== null && (
        <div
          className="source-match-track"
          role="img"
          aria-label={`Similarity score ${similarity.toFixed(0)} percent`}
        >
          <span style={{ width: `${similarity}%` }} />
        </div>
      )}

      <p className="source-snippet">{source.snippet}</p>

      <div className="source-foot">
        <span>Retrieved passage · Chunk {source.chunk_index + 1}</span>
        {source.source_url && (
          <a
            href={source.source_url}
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
