"use client";

import { QRCodeSVG } from "qrcode.react";

interface QrDisplayProps {
  url: string;
  token: string;
}

export function QrDisplay({ url, token }: QrDisplayProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="rounded-2xl border border-border/60 bg-white p-4">
        <QRCodeSVG value={url} size={200} level="M" includeMargin />
      </div>
      <p className="font-mono text-sm text-muted-foreground">{token}</p>
    </div>
  );
}
