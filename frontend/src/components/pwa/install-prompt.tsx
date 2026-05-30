"use client";

import { Download, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useInstallPrompt } from "@/hooks/use-install-prompt";

export function InstallPrompt() {
  const { installPrompt, promptInstall, isIOS, isStandalone } =
    useInstallPrompt();

  if (isStandalone) return null;

  if (isIOS) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex items-start gap-3 p-4">
          <Share className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div className="space-y-1 text-sm">
            <p className="font-medium">Install on iOS</p>
            <p className="text-muted-foreground">
              Tap Share, then &quot;Add to Home Screen&quot; for an app-like experience.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!installPrompt) return null;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Download className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div className="space-y-1 text-sm">
            <p className="font-medium">Install ClipDrop</p>
            <p className="text-muted-foreground">
              Add to your home screen for instant clipboard sync.
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => promptInstall()}>
          Install
        </Button>
      </CardContent>
    </Card>
  );
}
