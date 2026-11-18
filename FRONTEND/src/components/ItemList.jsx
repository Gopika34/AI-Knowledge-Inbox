import { Inbox, Plus, Search, ChevronLeft, ChevronRight } from "lucide-react";
import ItemCard from "./ItemCard";

export default function ItemList({ items, total, loading, onAdd, page, pageSize, search, onSearchChange, onPageChange, onDelete }) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (loading) return <p className="muted center-text">Loading your library...</p>;
  const isEmpty = total === 0;

  return (
    <section>
      <div className="list-intro">
        <div><span className="eyebrow">YOUR LIBRARY</span><h2 className="section-title">A home for what matters.</h2><p className="muted">Search across every saved note and imported webpage.</p></div>
        <span className="library-count">{total} {total === 1 ? "item" : "items"}</span>
      </div>
      {!isEmpty && <div className="list-toolbar"><div className="search-box"><Search size={16} /><input value={search} onChange={(e) => onSearchChange(e.target.value)} placeholder="Search all saved content" aria-label="Search all saved content" /></div><span className="muted">Page {page + 1} of {pageCount}</span></div>}
      {isEmpty ? <div className="empty-state"><Inbox size={28} /><h3>Start your knowledge library</h3><p>Save a useful note or import an article. Your content will be indexed so you can ask questions later.</p><button type="button" className="button button-primary inline" onClick={onAdd}><Plus size={16} />Add your first item</button></div> : items.length === 0 ? <div className="empty-state"><Search size={26} /><h3>No results found</h3><p>Try another search phrase.</p></div> : <><div className="items-grid">{items.map((item) => <ItemCard key={item.id} item={item} onDelete={onDelete} />)}</div><div className="pagination"><span className="muted">Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)} of {total}</span><div><button className="icon-button" type="button" aria-label="Previous page" disabled={page === 0} onClick={() => onPageChange(page - 1)}><ChevronLeft size={17} /></button><button className="icon-button" type="button" aria-label="Next page" disabled={page + 1 >= pageCount} onClick={() => onPageChange(page + 1)}><ChevronRight size={17} /></button></div></div></>}
    </section>
  );
}
