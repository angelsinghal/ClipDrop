"use client";

import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useEnsureSession } from "@/hooks/use-session";
import { useSessionStore } from "@/stores/session-store";

export function SessionBootstrap({ children }: { children: React.ReactNode }) {
  const hydrated = useSessionStore((s) => s.hydrated);
  const token = useSessionStore((s) => s.token);
  const setSessionInfo = useSessionStore((s) => s.setSessionInfo);
  const { initMutation, sessionQuery } = useEnsureSession();

  useEffect(() => {
    if (!hydrated) return;
    if (!token && !initMutation.isPending && !initMutation.isSuccess) {
      initMutation.mutate();
    }
  }, [hydrated, token, initMutation]);

  useEffect(() => {
    if (sessionQuery.data) setSessionInfo(sessionQuery.data);
  }, [sessionQuery.data, setSessionInfo]);

  if (!hydrated || (!token && initMutation.isPending)) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!token && initMutation.isError) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-destructive">Could not start session</p>
        <button
          type="button"
          className="text-sm text-primary underline"
          onClick={() => initMutation.mutate()}
        >
          Retry
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
