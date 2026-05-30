"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";

interface QrScannerProps {
  onScan: (decoded: string) => void;
}

export function QrScanner({ onScan }: QrScannerProps) {
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const id = "clipdrop-qr-reader";

  useEffect(() => {
    if (!active) return;

    const scanner = new Html5Qrcode(id);
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (text) => {
          onScan(text);
          scanner.stop().catch(() => undefined);
          setActive(false);
        },
        () => undefined,
      )
      .catch((err: Error) => {
        setError(err.message || "Camera access failed");
        setActive(false);
      });

    return () => {
      scanner.stop().catch(() => undefined);
      scannerRef.current = null;
    };
  }, [active, onScan]);

  return (
    <div className="space-y-3">
      <div
        id={id}
        className="min-h-[240px] overflow-hidden rounded-xl border border-border/60 bg-muted/20"
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      {!active ? (
        <Button onClick={() => setActive(true)} className="w-full">
          Start camera scanner
        </Button>
      ) : (
        <Button
          variant="outline"
          onClick={() => {
            scannerRef.current?.stop().catch(() => undefined);
            setActive(false);
          }}
          className="w-full"
        >
          Stop scanner
        </Button>
      )}
    </div>
  );
}
