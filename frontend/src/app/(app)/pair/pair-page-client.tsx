"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { QrDisplay } from "@/components/pairing/qr-display";
import { QrScanner } from "@/components/pairing/qr-scanner";
import { api } from "@/lib/api";
import { useSessionStore } from "@/stores/session-store";
import { getDefaultDeviceName } from "@/lib/clipboard";
import { Skeleton } from "@/components/ui/skeleton";

function PairPageContent() {
  const token = useSessionStore((s) => s.token);
  const setSession = useSessionStore((s) => s.setSession);
  const searchParams = useSearchParams();
  const incomingToken = searchParams.get("token");
  const [manualToken, setManualToken] = useState(incomingToken ?? "");

  const init = useMutation({
    mutationFn: () => api.initPairing(token!),
    onError: (e: Error) => toast.error(e.message),
  });

  const status = useQuery({
    queryKey: ["pairing", init.data?.token],
    queryFn: () => api.pairingStatus(token!, init.data!.token),
    enabled: !!token && !!init.data?.token,
    refetchInterval: (q) =>
      q.state.data?.status === "pending" ? 2000 : false,
  });

  const confirm = useMutation({
    mutationFn: (pairToken: string) =>
      api.confirmPairing({
        token: pairToken,
        device_name: getDefaultDeviceName(),
        platform: "web",
      }),
    onSuccess: (data) => {
      setSession({
        token: data.token,
        expiresAt: data.expires_at,
        workspaceId: data.workspace_id,
        deviceId: data.device_id,
      });
      toast.success("Device paired");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  useEffect(() => {
    if (token && !init.data && !init.isPending && !init.isError) {
      init.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once when token ready
  }, [token]);

  useEffect(() => {
    if (status.data?.status === "completed") {
      toast.success("New device joined your workspace");
    }
  }, [status.data?.status]);

  const handleScan = (text: string) => {
    try {
      const url = new URL(text);
      const t = url.searchParams.get("token");
      if (t) {
        setManualToken(t);
        confirm.mutate(t);
        return;
      }
    } catch {
      /* not a url */
    }
    setManualToken(text);
    confirm.mutate(text);
  };

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pair device</h1>
        <p className="text-sm text-muted-foreground">
          Scan the QR code or enter a pairing token on your other device
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Show QR on this device</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center">
          {init.isPending && <Skeleton className="h-[220px] w-[220px]" />}
          {init.data && (
            <QrDisplay url={init.data.qr_url} token={init.data.token} />
          )}
        </CardContent>
      </Card>

      {status.data?.status === "pending" && (
        <p className="text-center text-sm text-muted-foreground">
          Waiting for device to join…
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Join with another device</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <QrScanner onScan={handleScan} />
          <div className="flex gap-2">
            <Input
              placeholder="Pairing token"
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
            />
            <Button
              onClick={() => confirm.mutate(manualToken)}
              disabled={!manualToken || confirm.isPending}
            >
              Join
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function PairPageClient() {
  return (
    <Suspense fallback={<Skeleton className="h-[400px] w-full rounded-xl" />}>
      <PairPageContent />
    </Suspense>
  );
}
