"use client";

import { SnippetCard } from "@/components/snippets/snippet-card";
import { SnippetListSkeleton } from "@/components/snippets/snippet-list-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useSnippetsStore } from "@/stores/snippets-store";

interface SnippetListProps {
  loading?: boolean;
  onPin: (id: string, pin: boolean) => void;
  onDelete: (id: string) => void;
  onShare: (id: string) => void;
}

export function SnippetList({
  loading,
  onPin,
  onDelete,
  onShare,
}: SnippetListProps) {
  const filteredItems = useSnippetsStore((s) => s.filteredItems);
  const items = filteredItems();

  if (loading) return <SnippetListSkeleton />;

  if (items.length === 0) {
    return (
      <EmptyState
        title="No clips yet"
        description="Paste, drop a file, or sync from your clipboard to get started."
      />
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {items.map((snippet) => (
        <li key={snippet.id}>
          <SnippetCard
            snippet={snippet}
            onPin={onPin}
            onDelete={onDelete}
            onShare={onShare}
          />
        </li>
      ))}
    </ul>
  );
}
