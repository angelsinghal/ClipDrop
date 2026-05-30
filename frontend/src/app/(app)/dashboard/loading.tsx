import { SnippetListSkeleton } from "@/components/snippets/snippet-list-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-24 w-full rounded-xl" />
      <SnippetListSkeleton />
    </div>
  );
}
