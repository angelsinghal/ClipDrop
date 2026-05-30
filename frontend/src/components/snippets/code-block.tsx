"use client";

import { useEffect, useState } from "react";
import { codeToHtml } from "shiki";
import { cn } from "@/lib/utils";

interface CodeBlockProps {
  code: string;
  lang?: string | null;
  className?: string;
}

export function CodeBlock({ code, lang = "text", className }: CodeBlockProps) {
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    codeToHtml(code, {
      lang: lang || "text",
      theme: "github-dark-default",
    })
      .then((result) => {
        if (!cancelled) setHtml(result);
      })
      .catch(() => {
        if (!cancelled) setHtml(null);
      });
    return () => {
      cancelled = true;
    };
  }, [code, lang]);

  if (!html) {
    return (
      <pre
        className={cn(
          "overflow-x-auto rounded-lg bg-muted/50 p-3 font-mono text-xs leading-relaxed",
          className,
        )}
      >
        <code>{code}</code>
      </pre>
    );
  }

  return (
    <div
      className={cn(
        "overflow-x-auto rounded-lg border border-border/40 text-xs [&_pre]:!bg-muted/30 [&_pre]:p-3",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
