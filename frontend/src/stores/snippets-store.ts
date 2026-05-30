import { create } from "zustand";
import type { Snippet } from "@/types";

interface SnippetsState {
  items: Snippet[];
  wsConnected: boolean;
  search: string;
  typeFilter: string | null;
  showPinnedOnly: boolean;
  setItems: (items: Snippet[]) => void;
  upsertSnippet: (snippet: Snippet) => void;
  removeSnippet: (id: string) => void;
  setWsConnected: (v: boolean) => void;
  setSearch: (q: string) => void;
  setTypeFilter: (t: string | null) => void;
  setShowPinnedOnly: (v: boolean) => void;
  filteredItems: () => Snippet[];
}

export const useSnippetsStore = create<SnippetsState>((set, get) => ({
  items: [],
  wsConnected: false,
  search: "",
  typeFilter: null,
  showPinnedOnly: false,
  setItems: (items) => set({ items }),
  upsertSnippet: (snippet) =>
    set((state) => {
      const idx = state.items.findIndex((s) => s.id === snippet.id);
      if (idx >= 0) {
        const next = [...state.items];
        next[idx] = snippet;
        return { items: next.sort((a, b) => b.created_at - a.created_at) };
      }
      return {
        items: [snippet, ...state.items].sort(
          (a, b) => b.created_at - a.created_at,
        ),
      };
    }),
  removeSnippet: (id) =>
    set((state) => ({ items: state.items.filter((s) => s.id !== id) })),
  setWsConnected: (wsConnected) => set({ wsConnected }),
  setSearch: (search) => set({ search }),
  setTypeFilter: (typeFilter) => set({ typeFilter }),
  setShowPinnedOnly: (showPinnedOnly) => set({ showPinnedOnly }),
  filteredItems: () => {
    const { items, search, typeFilter, showPinnedOnly } = get();
    let result = [...items];
    if (showPinnedOnly) result = result.filter((s) => s.pinned);
    if (typeFilter) result = result.filter((s) => s.type === typeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.content.toLowerCase().includes(q) ||
          s.title?.toLowerCase().includes(q) ||
          s.device_name.toLowerCase().includes(q),
      );
    }
    return result.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.created_at - a.created_at;
    });
  },
}));
