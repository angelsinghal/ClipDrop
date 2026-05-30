"use client";

import { CloudOff } from "lucide-react";
import { useUiStore } from "@/stores/ui-store";

export function OfflineBanner() {
  const isOnline = useUiStore((s) => s.isOnline);
  if (isOnline) return null;

  return (
    <div className="bg-amber-500/10 px-4 py-2 text-center text-sm text-amber-200">
      <CloudOff className="mr-2 inline h-4 w-4" />
      You&apos;re offline. Cached clips are available; changes sync when back online.
    </div>
  );
}
