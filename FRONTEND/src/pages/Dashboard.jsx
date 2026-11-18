import { useCallback, useEffect, useState } from "react";

import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import NoteForm from "../components/NoteForm";
import UrlForm from "../components/UrlForm";
import ItemList from "../components/ItemList";
import ChatPanel from "../components/ChatPanel";

import { getItems } from "../api/client";

import { RefreshCw } from "lucide-react";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("inbox");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadItems = useCallback(async () => {
    try {
      setError("");
      const data = await getItems();

      setItems(data.items || []);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Unable to load saved knowledge."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  function renderContent() {
    if (activeTab === "add") {
      return (
        <div className="forms-grid">
          <NoteForm onSuccess={loadItems} />
          <UrlForm onSuccess={loadItems} />
        </div>
      );
    }

    if (activeTab === "chat") {
      return <ChatPanel />;
    }

    return (
      <ItemList
        items={items}
        loading={loading}
      />
    );
  }

  return (
    <div className="app-layout">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        itemCount={items.length}
      />

      <main className="main-content">
        <Header activeTab={activeTab} />

        {error && (
          <div className="error-banner">
            {error}

            <button onClick={loadItems}>
              <RefreshCw size={15} />
              Retry
            </button>
          </div>
        )}

        <div className="page-content">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
