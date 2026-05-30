"use client";

import { useEffect } from "react";
import { useUiStore } from "@/stores/ui-store";
import type { BeforeInstallPromptEvent } from "@/types";

export function useInstallPrompt() {
  const setInstallPrompt = useUiStore((s) => s.setInstallPrompt);
  const installPrompt = useUiStore((s) => s.installPrompt);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [setInstallPrompt]);

  const promptInstall = async () => {
    if (!installPrompt) return false;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") setInstallPrompt(null);
    return outcome === "accepted";
  };

  const isIOS =
    typeof navigator !== "undefined" &&
    /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isStandalone =
    typeof window !== "undefined" &&
    (window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error ios standalone
      window.navigator.standalone === true);

  return { installPrompt, promptInstall, isIOS, isStandalone };
}
