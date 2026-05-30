"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useSnippetsStore } from "@/stores/snippets-store";

export function SnippetFilters() {
  const search = useSnippetsStore((s) => s.search);
  const setSearch = useSnippetsStore((s) => s.setSearch);
  const typeFilter = useSnippetsStore((s) => s.typeFilter);
  const setTypeFilter = useSnippetsStore((s) => s.setTypeFilter);
  const showPinnedOnly = useSnippetsStore((s) => s.showPinnedOnly);
  const setShowPinnedOnly = useSnippetsStore((s) => s.setShowPinnedOnly);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search clips…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>
      <Select
        value={typeFilter ?? "all"}
        onValueChange={(v) => setTypeFilter(v === "all" ? null : v)}
      >
        <SelectTrigger className="w-full sm:w-[140px]">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All types</SelectItem>
          <SelectItem value="text">Text</SelectItem>
          <SelectItem value="code">Code</SelectItem>
          <SelectItem value="link">Link</SelectItem>
          <SelectItem value="image">Image</SelectItem>
          <SelectItem value="file">File</SelectItem>
        </SelectContent>
      </Select>
      <Button
        variant={showPinnedOnly ? "secondary" : "outline"}
        size="sm"
        onClick={() => setShowPinnedOnly(!showPinnedOnly)}
        className="shrink-0"
      >
        Pinned only
      </Button>
    </div>
  );
}
