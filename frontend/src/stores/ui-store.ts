import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SETTINGS_STORAGE_KEY } from "@/lib/constants";
import type { BeforeInstallPromptEvent } from "@/types";

interface UiSettings {
  autoSyncClipboard: boolean;
  showSensitiveWarning: boolean;
  defaultExpiryMinutes: number | null;
  deviceName: string;
}

interface UiState extends UiSettings {
  installPrompt: BeforeInstallPromptEvent | null;
  isOnline: boolean;
  sidebarOpen: boolean;
  setInstallPrompt: (e: BeforeInstallPromptEvent | null) => void;
  setOnline: (v: boolean) => void;
  setSidebarOpen: (v: boolean) => void;
  updateSettings: (partial: Partial<UiSettings>) => void;
}

const defaultSettings: UiSettings = {
  autoSyncClipboard: false,
  showSensitiveWarning: true,
  defaultExpiryMinutes: null,
  deviceName: "",
};

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      ...defaultSettings,
      installPrompt: null,
      isOnline: true,
      sidebarOpen: false,
      setInstallPrompt: (installPrompt) => set({ installPrompt }),
      setOnline: (isOnline) => set({ isOnline }),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      updateSettings: (partial) => set((s) => ({ ...s, ...partial })),
    }),
    {
      name: SETTINGS_STORAGE_KEY,
      partialize: (s) => ({
        autoSyncClipboard: s.autoSyncClipboard,
        showSensitiveWarning: s.showSensitiveWarning,
        defaultExpiryMinutes: s.defaultExpiryMinutes,
        deviceName: s.deviceName,
      }),
    },
  ),
);
