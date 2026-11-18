import { useState } from "react";
import { Search, Inbox } from "lucide-react";
import ItemCard from "./ItemCard";

export default function ItemList({ items, loading }) {
  const [search, setSearch] = useState("");

  const filteredItems = items.filter((item) =>
    `${item.title} ${item.preview || ""}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="empty-state">Loading your knowledge...</div>;
  }

  return (
    <section>
      <div className="list-toolbar">
        <div>
          <h2>Saved knowledge</h2>
          <p>{items.length} items in your inbox</p>
        </div>

        <div className="search-box">
          <Search size={17} />

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search saved items..."
          />
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="empty-state">
          <Inbox size={34} />
          <h3>{items.length ? "No matching items" : "Your inbox is empty"}</h3>
          <p>
            {items.length
              ? "Try another search."
              : "Add a note or webpage to start building your knowledge base."}
          </p>
        </div>
      ) : (
        <div className="items-grid">
          {filteredItems.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}
