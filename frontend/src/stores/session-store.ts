import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SESSION_STORAGE_KEY } from "@/lib/constants";
import type { Device, SessionInfo } from "@/types";

interface SessionState {
  token: string | null;
  expiresAt: number | null;
  workspaceId: string | null;
  deviceId: string | null;
  deviceName: string | null;
  devices: Device[];
  hydrated: boolean;
  setSession: (data: {
    token: string;
    expiresAt: number;
    workspaceId: string;
    deviceId: string;
    deviceName?: string;
  }) => void;
  setSessionInfo: (info: SessionInfo) => void;
  clearSession: () => void;
  setHydrated: (v: boolean) => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      token: null,
      expiresAt: null,
      workspaceId: null,
      deviceId: null,
      deviceName: null,
      devices: [],
      hydrated: false,
      setSession: (data) =>
        set({
          token: data.token,
          expiresAt: data.expiresAt,
          workspaceId: data.workspaceId,
          deviceId: data.deviceId,
          deviceName: data.deviceName ?? null,
        }),
      setSessionInfo: (info) =>
        set({
          workspaceId: info.workspace_id,
          deviceId: info.device_id,
          deviceName: info.device_name,
          devices: info.devices,
        }),
      clearSession: () =>
        set({
          token: null,
          expiresAt: null,
          workspaceId: null,
          deviceId: null,
          deviceName: null,
          devices: [],
        }),
      setHydrated: (hydrated) => set({ hydrated }),
    }),
    {
      name: SESSION_STORAGE_KEY,
      partialize: (s) => ({
        token: s.token,
        expiresAt: s.expiresAt,
        workspaceId: s.workspaceId,
        deviceId: s.deviceId,
        deviceName: s.deviceName,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);
