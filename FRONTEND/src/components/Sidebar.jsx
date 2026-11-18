import {
  Inbox,
  MessageSquare,
  Plus,
  Brain,
  Database,
} from "lucide-react";

export default function Sidebar({
  activeTab,
  setActiveTab,
  itemCount,
}) {
  const navigation = [
    {
      id: "inbox",
      label: "Knowledge Inbox",
      icon: Inbox,
    },
    {
      id: "chat",
      label: "Ask AI",
      icon: MessageSquare,
    },
  ];

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-icon">
          <Brain size={22} />
        </div>

        <div>
          <h2>Knowly</h2>
          <span>AI Knowledge Inbox</span>
        </div>
      </div>

      <button
        className="new-note-button"
        onClick={() => setActiveTab("add")}
      >
        <Plus size={18} />
        Add knowledge
      </button>

      <p className="nav-label">WORKSPACE</p>

      <nav>
        {navigation.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              className={`nav-item ${
                activeTab === item.id ? "active" : ""
              }`}
              onClick={() => setActiveTab(item.id)}
            >
              <Icon size={19} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="sidebar-bottom">
        <div className="storage-info">
          <Database size={18} />

          <div>
            <strong>{itemCount} saved items</strong>
            <span>Your personal knowledge base</span>
          </div>
        </div>

        <span className="version">KNOWLY · LOCAL VERSION</span>
      </div>
    </aside>
  );
}