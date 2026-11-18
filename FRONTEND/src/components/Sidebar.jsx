import { BookOpenText, Inbox, MessageSquare, Plus, Sparkles } from "lucide-react";

const NAVIGATION = [
  { id: "inbox", label: "Library", icon: Inbox },
  { id: "chat", label: "Ask AI", icon: MessageSquare },
];

export default function Sidebar({ activeTab, setActiveTab, itemCount }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark" aria-hidden="true">
          <BookOpenText size={17} strokeWidth={1.8} />
        </div>
        <div className="brand-copy">
          <span className="brand-name">Knowledge Inbox</span>
          <span className="brand-caption">PERSONAL KNOWLEDGE SPACE</span>
        </div>
      </div>

      <button
        type="button"
        className="button button-primary sidebar-add"
        onClick={() => setActiveTab("add")}
      >
        <Plus size={16} strokeWidth={2.2} />
        <span>Add content</span>
      </button>

      <div className="sidebar-section-label">WORKSPACE</div>
      <nav className="nav" aria-label="Primary navigation">
        {NAVIGATION.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={`nav-item ${activeTab === id ? "active" : ""}`}
            aria-current={activeTab === id ? "page" : undefined}
            onClick={() => setActiveTab(id)}
          >
            <Icon size={17} strokeWidth={1.8} />
            <span>{label}</span>
            {id === "inbox" && <span className="nav-count">{itemCount}</span>}
          </button>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="sidebar-tip-icon"><Sparkles size={15} /></div>
        <div>
          <p className="sidebar-tip-title">Your second brain</p>
          <p className="sidebar-tip-copy">Save useful things. Find the answers later.</p>
        </div>
      </div>
    </aside>
  );
}
