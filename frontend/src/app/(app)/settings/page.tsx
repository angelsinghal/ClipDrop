"use client";

import { useSessionStore } from "@/stores/session-store";
import { useUiStore } from "@/stores/ui-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { Separator } from "@/components/ui/separator";
import { useRefreshSession } from "@/hooks/use-session";
import { toast } from "sonner";

export default function SettingsPage() {
  const workspaceId = useSessionStore((s) => s.workspaceId);
  const deviceId = useSessionStore((s) => s.deviceId);
  const devices = useSessionStore((s) => s.devices);
  const clearSession = useSessionStore((s) => s.clearSession);
  const settings = useUiStore();
  const refresh = useRefreshSession();

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Workspace, device, and sync preferences
        </p>
      </div>

      <InstallPrompt />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Device</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="deviceName">Display name</Label>
            <Input
              id="deviceName"
              value={settings.deviceName}
              onChange={(e) =>
                settings.updateSettings({ deviceName: e.target.value })
              }
              placeholder="My laptop"
            />
          </div>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>Device ID: {deviceId}</p>
            <p>Workspace: {workspaceId}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sync</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Auto-sync clipboard</Label>
              <p className="text-xs text-muted-foreground">
                Read clipboard when app is focused (where supported)
              </p>
            </div>
            <Switch
              checked={settings.autoSyncClipboard}
              onCheckedChange={(v) =>
                settings.updateSettings({ autoSyncClipboard: v })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Sensitive clip warnings</Label>
              <p className="text-xs text-muted-foreground">
                Confirm before syncing marked sensitive content
              </p>
            </div>
            <Switch
              checked={settings.showSensitiveWarning}
              onCheckedChange={(v) =>
                settings.updateSettings({ showSensitiveWarning: v })
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Paired devices</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {devices.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm"
              >
                <span>{d.name}</span>
                <span className="text-xs text-muted-foreground">
                  {d.platform}
                  {d.online ? " · online" : ""}
                </span>
              </li>
            ))}
            {devices.length === 0 && (
              <p className="text-sm text-muted-foreground">No devices listed</p>
            )}
          </ul>
        </CardContent>
      </Card>

      <Separator />

      <div className="flex flex-col gap-2">
        <Button
          variant="outline"
          onClick={() =>
            refresh.mutate(undefined, {
              onSuccess: () => toast.success("Session refreshed"),
            })
          }
          disabled={refresh.isPending}
        >
          Refresh session
        </Button>
        <Button
          variant="destructive"
          onClick={() => {
            clearSession();
            toast.success("Signed out");
            window.location.href = "/dashboard";
          }}
        >
          Clear local session
        </Button>
      </div>
    </div>
  );
}
