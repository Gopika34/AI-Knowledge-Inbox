import axios from "axios";

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_BASE_URL ||
    "http://127.0.0.1:8000",

  timeout: 30000,

  headers: {
    "Content-Type": "application/json",
  },
});

export async function getItems(skip = 0, limit = 20, search = "") {
  const response = await api.get("/items", {
    params: { skip, limit, ...(search.trim() ? { search: search.trim() } : {}) },
  });

  return response.data;
}

export async function addNote(title, content) {
  const response = await api.post("/ingest", {
    source_type: "note",
    title,
    content,
  });

  return response.data;
}

export async function addUrl(url) {
  const response = await api.post("/ingest", {
    source_type: "url",
    url,
  });

  return response.data;
}

export async function deleteItem(itemId) {
  await api.delete(`/items/${itemId}`);
}

export async function askQuestion(question, top_k = 5) {
  const response = await api.post("/query", {
    question,
    top_k,
  });

  return response.data;
}

export default api;