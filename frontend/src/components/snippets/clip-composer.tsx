"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { ClipboardPaste, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { readClipboardText } from "@/lib/clipboard";
import { MAX_UPLOAD_BYTES } from "@/lib/constants";
import { api } from "@/lib/api";
import { useSessionStore } from "@/stores/session-store";
import { toast } from "sonner";
import type { SnippetType } from "@/types";

interface ClipComposerProps {
  onSubmit: (body: {
    content: string;
    type?: SnippetType;
    file_id?: string;
    title?: string;
  }) => void;
  isPending?: boolean;
}

export function ClipComposer({ onSubmit, isPending }: ClipComposerProps) {
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const token = useSessionStore((s) => s.token);

  const onDrop = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file || !token) return;
      if (file.size > MAX_UPLOAD_BYTES) {
        toast.error(`Max file size is ${MAX_UPLOAD_BYTES / 1024} KB`);
        return;
      }
      setUploading(true);
      try {
        const ref = await api.uploadFile(token, file);
        const isImage = file.type.startsWith("image/");
        onSubmit({
          content: ref.url,
          type: isImage ? "image" : "file",
          file_id: ref.id,
          title: file.name,
        });
        toast.success("File uploaded");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [token, onSubmit],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    noClick: true,
    disabled: uploading || isPending,
  });

  const pasteFromClipboard = async () => {
    const clip = await readClipboardText();
    if (clip) setText(clip);
    else toast.error("Clipboard access denied or empty");
  };

  const send = () => {
    if (!text.trim()) return;
    onSubmit({ content: text.trim() });
    setText("");
  };

  return (
    <Card
      {...getRootProps()}
      className={isDragActive ? "border-primary ring-2 ring-primary/20" : ""}
    >
      <input {...getInputProps()} />
      <CardContent className="space-y-3 p-4">
        {isDragActive && (
          <p className="text-center text-sm text-primary">Drop file to upload</p>
        )}
        <Input
          placeholder="Paste text, link, or drop a file…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={pasteFromClipboard}
            disabled={isPending}
          >
            <ClipboardPaste className="h-4 w-4" />
            Paste
          </Button>
          <Button size="sm" onClick={send} disabled={!text.trim() || isPending}>
            {isPending || uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Sync
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
