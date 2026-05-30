"use client";

import {
  Clock,
  Copy,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Link2,
  Pin,
  Share2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CodeBlock } from "@/components/snippets/code-block";
import { copyToClipboard } from "@/lib/clipboard";
import { SNIPPET_TYPE_LABELS } from "@/lib/constants";
import { formatExpiry, formatRelativeTime, truncate } from "@/lib/utils";
import type { Snippet } from "@/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SnippetCardProps {
  snippet: Snippet;
  onPin: (id: string, pin: boolean) => void;
  onDelete: (id: string) => void;
  onShare: (id: string) => void;
}

export function SnippetCard({
  snippet,
  onPin,
  onDelete,
  onShare,
}: SnippetCardProps) {
  const expiry = formatExpiry(snippet.expires_at);
  const isExpired = expiry === "Expired";

  const handleCopy = async () => {
    const text =
      snippet.type === "link"
        ? snippet.content
        : snippet.file?.url ?? snippet.content;
    const ok = await copyToClipboard(text);
    toast[ok ? "success" : "error"](ok ? "Copied" : "Copy failed");
  };

  return (
    <Card
      className={cn(
        "group transition-colors hover:border-border",
        snippet.pinned && "border-primary/30 bg-primary/5",
        isExpired && "opacity-60",
      )}
    >
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 p-4 pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <TypeIcon type={snippet.type} />
          <Badge variant="secondary" className="font-normal">
            {SNIPPET_TYPE_LABELS[snippet.type] ?? snippet.type}
          </Badge>
          {snippet.lang && (
            <Badge variant="outline" className="font-mono text-[10px]">
              {snippet.lang}
            </Badge>
          )}
          {snippet.pinned && (
            <Pin className="h-3.5 w-3.5 fill-primary text-primary" />
          )}
          {snippet.sensitive && (
            <Badge variant="destructive">Sensitive</Badge>
          )}
          {expiry && (
            <Badge variant="outline" className="gap-1 font-normal">
              <Clock className="h-3 w-3" />
              {expiry}
            </Badge>
          )}
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">
          {formatRelativeTime(snippet.created_at)}
        </span>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-0">
        {snippet.title && (
          <p className="text-sm font-medium">{snippet.title}</p>
        )}
        <SnippetBody snippet={snippet} />
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            {snippet.device_name}
          </span>
          <div className="flex gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
            <Button variant="ghost" size="icon" onClick={handleCopy} aria-label="Copy">
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onPin(snippet.id, !snippet.pinned)}
              aria-label={snippet.pinned ? "Unpin" : "Pin"}
            >
              <Pin
                className={cn("h-4 w-4", snippet.pinned && "fill-primary text-primary")}
              />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onShare(snippet.id)}
              aria-label="Share"
            >
              <Share2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(snippet.id)}
              aria-label="Delete"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TypeIcon({ type }: { type: Snippet["type"] }) {
  const className = "h-4 w-4 text-muted-foreground";
  switch (type) {
    case "link":
      return <Link2 className={className} />;
    case "code":
      return <FileText className={className} />;
    case "image":
      return <ImageIcon className={className} />;
    case "file":
      return <FileText className={className} />;
    default:
      return <Copy className={className} />;
  }
}

function SnippetBody({ snippet }: { snippet: Snippet }) {
  if (snippet.type === "code") {
    return <CodeBlock code={snippet.content} lang={snippet.lang} />;
  }

  if (snippet.type === "link") {
    return (
      <a
        href={snippet.content}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-sm text-primary hover:underline"
      >
        {truncate(snippet.content, 80)}
        <ExternalLink className="h-3.5 w-3.5 shrink-0" />
      </a>
    );
  }

  if (snippet.type === "image") {
    const src = snippet.file?.url ?? snippet.content;
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={snippet.title ?? "Clipboard image"}
        className="max-h-48 rounded-lg border border-border/60 object-contain"
      />
    );
  }

  if (snippet.type === "file" && snippet.file) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/30 p-3 text-sm">
        <FileText className="h-8 w-8 text-muted-foreground" />
        <div>
          <p className="font-medium">{snippet.file.name}</p>
          <p className="text-xs text-muted-foreground">
            {(snippet.file.size / 1024).toFixed(1)} KB
          </p>
        </div>
      </div>
    );
  }

  return (
    <p className="whitespace-pre-wrap break-words text-sm text-foreground/90">
      {truncate(snippet.content, 500)}
    </p>
  );
}
