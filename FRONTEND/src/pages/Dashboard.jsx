import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import NoteForm from "../components/NoteForm";
import UrlForm from "../components/UrlForm";
import ItemList from "../components/ItemList";
import ChatPanel from "../components/ChatPanel";

import { getItems } from "../api/client";
import { getErrorMessage } from "../api/errors";
import useTheme from "../hooks/useTheme";

export default function Dashboard() {
  const { theme, toggleTheme } = useTheme();

  const [activeTab, setActiveTab] = useState("inbox");
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const pageSize = 20;

  // Bumping this number re-runs the fetch effect (after a save, or on Retry).
  const [refreshKey, setRefreshKey] = useState(0);
  const loadItems = useCallback(() => setRefreshKey((key) => key + 1), []);

  useEffect(() => {
    let ignore = false; // drops results from a stale request

    getItems(page * pageSize, pageSize, search)
      .then((data) => {
        if (ignore) return;

        setError("");
        setItems(data.items || []);
        setTotal(data.total ?? 0);
      })
      .catch((err) => {
        if (ignore) return;

        setError(getErrorMessage(err, "Unable to load saved items."));
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [refreshKey, page, search]);

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
      return <ChatPanel hasItems={total > 0} />;
    }

    return (
      <ItemList
        items={items}
        total={total}
        page={page}
        pageSize={pageSize}
        search={search}
        onSearchChange={(value) => { setSearch(value); setPage(0); }}
        onPageChange={setPage}
        onDelete={() => { if (items.length === 1 && page > 0) setPage((current) => current - 1); loadItems(); }}
        loading={loading}
        onAdd={() => setActiveTab("add")}
      />
    );
  }

  return (
    <div className="app-layout">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        itemCount={total}
      />

      <main className="main-content">
        <Header
          activeTab={activeTab}
          theme={theme}
          onToggleTheme={toggleTheme}
        />

        {error && (
          <div className="banner banner-error" role="alert">
            <span>{error}</span>

            <button type="button" className="link-button" onClick={loadItems}>
              <RefreshCw size={14} />
              Retry
            </button>
          </div>
        )}

        <div className="page-content">{renderContent()}</div>
      </main>
    </div>
  );
}
