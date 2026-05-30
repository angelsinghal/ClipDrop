"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { detectSnippetType } from "@/lib/utils";
import { useSessionStore } from "@/stores/session-store";
import { useSnippetsStore } from "@/stores/snippets-store";
import type { SnippetType } from "@/types";

export function useSnippetsQuery() {
  const token = useSessionStore((s) => s.token);
  const setItems = useSnippetsStore((s) => s.setItems);

  return useQuery({
    queryKey: ["snippets", token],
    queryFn: async () => {
      const res = await api.listSnippets(token!);
      setItems(res.items);
      return res;
    },
    enabled: !!token,
    staleTime: 30_000,
  });
}

export function useCreateSnippet() {
  const token = useSessionStore((s) => s.token);
  const upsert = useSnippetsStore((s) => s.upsertSnippet);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: {
      content: string;
      type?: SnippetType;
      lang?: string;
      title?: string;
      sensitive?: boolean;
      expires_in_sec?: number;
      file_id?: string;
    }) => {
      const type = body.type ?? detectSnippetType(body.content);
      return api.createSnippet(token!, { ...body, type });
    },
    onSuccess: (snippet) => {
      upsert(snippet);
      queryClient.invalidateQueries({ queryKey: ["snippets"] });
      toast.success("Synced to your devices");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteSnippet() {
  const token = useSessionStore((s) => s.token);
  const remove = useSnippetsStore((s) => s.removeSnippet);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.deleteSnippet(token!, id),
    onSuccess: (_, id) => {
      remove(id);
      queryClient.invalidateQueries({ queryKey: ["snippets"] });
      toast.success("Snippet deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function usePinSnippet() {
  const token = useSessionStore((s) => s.token);
  const upsert = useSnippetsStore((s) => s.upsertSnippet);

  return useMutation({
    mutationFn: ({ id, pin }: { id: string; pin: boolean }) =>
      api.pinSnippet(token!, id, pin),
    onSuccess: (snippet) => {
      upsert(snippet);
      toast.success(snippet.pinned ? "Pinned" : "Unpinned");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useShareSnippet() {
  const token = useSessionStore((s) => s.token);

  return useMutation({
    mutationFn: (snippetId: string) => api.createShare(token!, snippetId),
    onSuccess: async (data) => {
      await navigator.clipboard.writeText(data.url);
      toast.success("Share link copied");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
