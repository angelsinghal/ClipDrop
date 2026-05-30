"use client";

import { Wifi, WifiOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useSnippetsStore } from "@/stores/snippets-store";
import { useUiStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";

export function ConnectionBadge() {
  const wsConnected = useSnippetsStore((s) => s.wsConnected);
  const isOnline = useUiStore((s) => s.isOnline);

  const ok = isOnline && wsConnected;

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 font-normal",
        ok ? "border-emerald-500/30 text-emerald-400" : "border-amber-500/30 text-amber-400",
      )}
    >
      {ok ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
      {ok ? "Live" : isOnline ? "Connecting" : "Offline"}
    </Badge>
  );
}
