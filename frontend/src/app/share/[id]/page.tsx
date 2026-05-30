"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Copy, Link2, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { CodeBlock } from "@/components/snippets/code-block";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { copyToClipboard } from "@/lib/clipboard";
import { SNIPPET_TYPE_LABELS } from "@/lib/constants";
import { toast } from "sonner";

export default function SharePage() {
  const params = useParams();
  const shareId = params.id as string;

  const { data, isLoading, error } = useQuery({
    queryKey: ["share", shareId],
    queryFn: () => api.getPublicShare(shareId),
    enabled: !!shareId,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6">
        <p className="text-muted-foreground">Share not found or expired</p>
        <Button asChild variant="outline">
          <Link href="/dashboard">Open ClipDrop</Link>
        </Button>
      </div>
    );
  }

  const handleCopy = async () => {
    const ok = await copyToClipboard(data.content);
    toast[ok ? "success" : "error"](ok ? "Copied" : "Copy failed");
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 py-12">
      <Link href="/" className="mb-8 flex items-center gap-2 text-sm font-medium">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-primary">
          <Link2 className="h-4 w-4" />
        </div>
        ClipDrop
      </Link>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">
            {data.title ?? "Shared clip"}
          </CardTitle>
          <Badge variant="secondary">
            {SNIPPET_TYPE_LABELS[data.type] ?? data.type}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.type === "code" ? (
            <CodeBlock code={data.content} lang={data.lang} />
          ) : data.type === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.file?.url ?? data.content}
              alt=""
              className="max-h-64 rounded-lg border border-border/60"
            />
          ) : (
            <p className="whitespace-pre-wrap break-words text-sm">
              {data.content}
            </p>
          )}
          <Button onClick={handleCopy} className="w-full">
            <Copy className="h-4 w-4" />
            Copy to clipboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
