"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getDefaultDeviceName } from "@/lib/clipboard";
import { useSessionStore } from "@/stores/session-store";
import { useUiStore } from "@/stores/ui-store";

export function useEnsureSession() {
  const token = useSessionStore((s) => s.token);
  const hydrated = useSessionStore((s) => s.hydrated);
  const setSession = useSessionStore((s) => s.setSession);
  const deviceName = useUiStore((s) => s.deviceName);

  const initMutation = useMutation({
    mutationFn: () =>
      api.createSession({
        device_name: deviceName || getDefaultDeviceName(),
        platform: "web",
      }),
    onSuccess: (data) => {
      setSession({
        token: data.token,
        expiresAt: data.expires_at,
        workspaceId: data.workspace_id,
        deviceId: data.device_id,
      });
    },
  });

  const sessionQuery = useQuery({
    queryKey: ["session", token],
    queryFn: () => api.getSession(token!),
    enabled: !!token && hydrated,
  });

  return { token, hydrated, initMutation, sessionQuery };
}

export function useRefreshSession() {
  const token = useSessionStore((s) => s.token);
  const setSession = useSessionStore((s) => s.setSession);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.refreshSession(token!),
    onSuccess: (data) => {
      setSession({
        token: data.token,
        expiresAt: data.expires_at,
        workspaceId: data.workspace_id,
        deviceId: data.device_id,
      });
      queryClient.invalidateQueries({ queryKey: ["session"] });
    },
  });
}
