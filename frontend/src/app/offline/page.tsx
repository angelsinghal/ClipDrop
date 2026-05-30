import Link from "next/link";
import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-6 text-center">
      <WifiOff className="h-12 w-12 text-muted-foreground" />
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">You&apos;re offline</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          ClipDrop needs a connection to sync new clips. Previously cached pages
          may still be available.
        </p>
      </div>
      <Button asChild>
        <Link href="/dashboard">Try again</Link>
      </Button>
    </div>
  );
}
