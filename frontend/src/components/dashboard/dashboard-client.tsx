"use client";

import { useEffect } from "react";
import { MOCK_API } from "@/lib/constants";
import { mockApi } from "@/lib/mock";
import { ClipComposer } from "@/components/snippets/clip-composer";
import { SnippetFilters } from "@/components/snippets/snippet-filters";
import { SnippetList } from "@/components/snippets/snippet-list";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import {
  useCreateSnippet,
  useDeleteSnippet,
  usePinSnippet,
  useShareSnippet,
  useSnippetsQuery,
} from "@/hooks/use-snippets";
import { useWebSocket } from "@/hooks/use-websocket";

export function DashboardClient() {
  useWebSocket();
  const { data, isLoading, refetch } = useSnippetsQuery();
  const create = useCreateSnippet();
  const del = useDeleteSnippet();
  const pin = usePinSnippet();
  const share = useShareSnippet();

  useEffect(() => {
    if (typeof document === "undefined") return;
    if ("serviceWorker" in navigator && "sync" in ServiceWorkerRegistration.prototype) {
      navigator.serviceWorker.ready
        .then((reg) => {
          // @ts-expect-error periodic sync experimental
          return reg.periodicSync?.register("clipdrop-sync", {
            minInterval: 60 * 60 * 1000,
          });
        })
        .catch(() => undefined);
    }
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Clipboard</h1>
        <p className="text-sm text-muted-foreground">
          Synced across your devices in real time
        </p>
      </div>

      <InstallPrompt />

      <ClipComposer
        onSubmit={(body) => create.mutate(body)}
        isPending={create.isPending}
      />

      <SnippetFilters />

      <SnippetList
        loading={isLoading && !data}
        onPin={(id, p) => pin.mutate({ id, pin: p })}
        onDelete={(id) => del.mutate(id)}
        onShare={(id) => share.mutate(id)}
      />

      {MOCK_API && (
        <p className="text-center text-xs text-muted-foreground">
          Mock mode —{" "}
          <button
            type="button"
            className="text-primary underline"
            onClick={() => {
              mockApi.simulateRemoteSnippet();
              refetch();
            }}
          >
            simulate remote clip
          </button>
        </p>
      )}
    </div>
  );
}
