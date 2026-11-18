import { useState } from "react";

import {
  Send,
  Sparkles,
  User,
  LoaderCircle,
} from "lucide-react";

import { askQuestion } from "../api/client";
import SourceCard from "./SourceCard";

export default function ChatPanel() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();

    const value = question.trim();

    if (!value || loading) return;

    setQuestion("");
    setError("");

    setMessages((previous) => [
      ...previous,
      {
        role: "user",
        content: value,
      },
    ]);

    setLoading(true);

    try {
      const result = await askQuestion(value, 5);

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: result.answer,
          sources: result.sources || [],
        },
      ]);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="chat-container">
      <div className="chat-intro">
        <div className="ai-avatar">
          <Sparkles size={25} />
        </div>

        <h2>Ask your knowledge</h2>

        <p>
          Your AI assistant searches your saved notes and
          webpages before answering.
        </p>
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="empty-state">
            <Sparkles size={30} />
            <h3>What would you like to know?</h3>
            <p>
              Try asking a question about something
              you've saved.
            </p>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`message ${message.role}`}
          >
            <div className="message-avatar">
              {message.role === "user" ? (
                <User size={17} />
              ) : (
                <Sparkles size={17} />
              )}
            </div>

            <div className="message-body">
              <span className="message-author">
                {message.role === "user" ? "You" : "Knowly AI"}
              </span>

              <div className="message-text">
                {message.content}
              </div>

              {message.role === "assistant" &&
                message.sources?.length > 0 && (
                  <div className="citations">
                    <h4>
                      Sources ({message.sources.length})
                    </h4>

                    {message.sources.map((source, i) => (
                      <SourceCard
                        key={`${source.chunk_id}-${i}`}
                        source={source}
                        index={i}
                      />
                    ))}
                  </div>
                )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="loading-message">
            <LoaderCircle className="spin" size={18} />
            Searching your knowledge and generating an answer...
          </div>
        )}
      </div>

      {error && <p className="error-message">{error}</p>}

      <form className="chat-input" onSubmit={handleSubmit}>
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask something about your saved knowledge..."
          maxLength={2000}
          disabled={loading}
        />

        <button
          type="submit"
          disabled={!question.trim() || loading}
          aria-label="Send question"
        >
          <Send size={19} />
        </button>
      </form>
    </section>
  );
}
