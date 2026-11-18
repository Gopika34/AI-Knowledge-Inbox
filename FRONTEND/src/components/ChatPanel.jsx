import { useEffect, useRef, useState } from "react";
import { ArrowUp, LoaderCircle, RotateCcw } from "lucide-react";

import { askQuestion } from "../api/client";
import { getErrorMessage } from "../api/errors";
import SourceCard from "./SourceCard";

const CITATION_PATTERN = /\[S(\d+)\]/g;

function AnswerText({ text }) {
  const parts = text.split(CITATION_PATTERN);
  return (
    <p className="answer-text">
      {parts.map((part, index) => index % 2 === 1
        ? <span key={index} className="cite-chip inline">{part}</span>
        : part)}
    </p>
  );
}

export default function ChatPanel({ hasItems }) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retryQuestion, setRetryQuestion] = useState("");
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading, error]);

  async function runQuestion(value, addUserMessage = true) {
    if (!value || value.length < 3 || loading) return;
    setError("");
    setLoading(true);
    if (addUserMessage) setMessages((previous) => [...previous, { role: "user", content: value }]);
    try {
      const result = await askQuestion(value, 5);
      setMessages((previous) => [...previous, {
        role: "assistant",
        content: result.answer,
        sources: result.sources || [],
      }]);
      setRetryQuestion("");
    } catch (err) {
      setError(getErrorMessage(err, "Something went wrong. Please try again."));
      setRetryQuestion(value);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const value = question.trim();
    if (value.length < 3 || loading) return;
    setQuestion("");
    await runQuestion(value);
  }

  return (
    <section className="chat">
      <div className="chat-thread">
        {messages.length === 0 && (
          <div className="empty-state">
            <h3>Ask about your saved content</h3>
            <p>{hasItems
              ? "Ask a question across your notes and webpages. Answers include the passages they came from."
              : "Save a note or webpage first. Your inbox will become the source for your answers."}</p>
          </div>
        )}
        {messages.map((message, index) => message.role === "user" ? (
          <div key={index} className="msg msg-user"><div className="bubble">{message.content}</div></div>
        ) : (
          <div key={index} className="msg msg-assistant">
            <div className="card answer-card">
              <AnswerText text={message.content} />
              {message.sources?.length > 0 && <div className="sources">
                <h4>Sources ({message.sources.length})</h4>
                {message.sources.map((source, i) => <SourceCard key={`${source.chunk_id}-${i}`} source={source} index={i} />)}
              </div>}
            </div>
          </div>
        ))}
        {loading && <div className="msg msg-assistant"><div className="thinking"><LoaderCircle className="spin" size={16} />Searching your content...</div></div>}
        {error && <div className="chat-error" role="alert"><p>{error}</p><button type="button" className="link-button" disabled={loading} onClick={() => runQuestion(retryQuestion, false)}><RotateCcw size={14} />Retry question</button></div>}
        <div ref={endRef} />
      </div>
      <form className="chat-input" onSubmit={handleSubmit}>
        <input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask a question about your saved content" aria-label="Your question" maxLength={2000} disabled={loading} />
        <button type="submit" className="send-button" disabled={question.trim().length < 3 || loading} aria-label="Send question"><ArrowUp size={18} /></button>
      </form>
    </section>
  );
}
