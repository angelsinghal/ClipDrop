"use client";

import { useEffect, useRef } from "react";
import { MOCK_API } from "@/lib/constants";
import { ClipDropWebSocket } from "@/lib/ws";
import { useSessionStore } from "@/stores/session-store";
import { useSnippetsStore } from "@/stores/snippets-store";
import { toast } from "sonner";

export function useWebSocket() {
  const token = useSessionStore((s) => s.token);
  const workspaceId = useSessionStore((s) => s.workspaceId);
  const deviceId = useSessionStore((s) => s.deviceId);
  const setSessionInfo = useSessionStore((s) => s.setSessionInfo);
  const upsert = useSnippetsStore((s) => s.upsertSnippet);
  const remove = useSnippetsStore((s) => s.removeSnippet);
  const setWsConnected = useSnippetsStore((s) => s.setWsConnected);
  const wsRef = useRef<ClipDropWebSocket | null>(null);

  useEffect(() => {
    if (!token || !workspaceId || !deviceId) return;

    const client = new ClipDropWebSocket(token, workspaceId, deviceId, {
      onOpen: () => setWsConnected(true),
      onClose: () => setWsConnected(false),
      onSnippetPush: (snippet, sourceDeviceId) => {
        upsert(snippet);
        if (sourceDeviceId && sourceDeviceId !== deviceId) {
          toast.message("New clip", {
            description: `From ${snippet.device_name}`,
          });
        }
      },
      onSnippetDelete: (id) => remove(id),
      onError: (_, message) => toast.error(message),
    });

    client.connect();
    wsRef.current = client;

    return () => {
      client.disconnect();
      setWsConnected(false);
    };
  }, [
    token,
    workspaceId,
    deviceId,
    upsert,
    remove,
    setWsConnected,
    setSessionInfo,
  ]);

  return { ws: wsRef.current, isMock: MOCK_API };
}
