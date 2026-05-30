import { AppShell } from "@/components/layout/app-shell";
import { SessionBootstrap } from "@/components/session/session-bootstrap";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionBootstrap>
      <AppShell>{children}</AppShell>
    </SessionBootstrap>
  );
}
