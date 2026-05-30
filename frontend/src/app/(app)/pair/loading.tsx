import { Skeleton } from "@/components/ui/skeleton";

export default function PairLoading() {
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-[320px] w-full rounded-xl" />
    </div>
  );
}
