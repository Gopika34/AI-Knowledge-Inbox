import { Search, Sparkles } from "lucide-react";

export default function Header({ activeTab }) {
  const titles = {
    inbox: "Your knowledge",
    add: "Add knowledge",
    chat: "Ask your knowledge base",
  };

  const descriptions = {
    inbox: "Everything you've saved, in one place.",
    add: "Capture useful information for later.",
    chat: "Get answers grounded in your saved content.",
  };

  return (
    <header className="header">
      <div>
        <p className="breadcrumb">WORKSPACE / KNOWLEDGE</p>
        <h1>{titles[activeTab]}</h1>
        <p>{descriptions[activeTab]}</p>
      </div>

      <div className="header-status">
        <span className="status-dot" />
        <span>AI system ready</span>
        <Sparkles size={17} />
      </div>
    </header>
  );
}
