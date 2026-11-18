import { Layers3 } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

const PAGES = {
  inbox: {
    eyebrow: "YOUR WORKSPACE",
    title: "Your library",
    description: "Everything you've saved, in one searchable place.",
  },
  add: {
    eyebrow: "BUILD YOUR LIBRARY",
    title: "Add to your knowledge",
    description: "Save a note or bring in a webpage to make it searchable.",
  },
  chat: {
    eyebrow: "RETRIEVAL ASSISTANT",
    title: "Ask your knowledge",
    description: "Get answers grounded in the notes and webpages you've saved.",
  },
};

export default function Header({ activeTab, theme, onToggleTheme }) {
  const page = PAGES[activeTab];

  return (
    <header className="header">
      <div className="header-text">
        <span className="header-eyebrow">{page.eyebrow}</span>
        <h1>{page.title}</h1>
        <p>{page.description}</p>
      </div>
      <div className="header-actions">
        <span className="system-status"><Layers3 size={14} /> Knowledge workspace</span>
        <span className="header-divider" aria-hidden="true" />
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>
    </header>
  );
}
