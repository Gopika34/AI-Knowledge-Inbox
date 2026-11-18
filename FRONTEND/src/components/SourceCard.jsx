import { FileText, Globe, ExternalLink } from "lucide-react";

export default function SourceCard({ source, index }) {
  return (
    <article className="source-card">
      <div className="source-top">
        <span className="source-label">SOURCE {index + 1}</span>

        <span className="similarity">
          {(source.similarity * 100).toFixed(1)}% similarity
        </span>
      </div>

      <div className="source-title">
        {source.source_type === "url" ? (
          <Globe size={18} />
        ) : (
          <FileText size={18} />
        )}

        <strong>{source.title}</strong>
      </div>

      <p>{source.snippet}</p>

      <div className="source-bottom">
        <span>
          Chunk #{source.chunk_index}
        </span>

        {source.source_url && (
          <a
            href={source.source_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Original page <ExternalLink size={13} />
          </a>
        )}
      </div>
    </article>
  );
}
