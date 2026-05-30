import type {
  PairingInitResponse,
  PairingStatusResponse,
  SessionCreateResponse,
  SessionInfo,
  ShareCreateResponse,
  Snippet,
  SnippetsListResponse,
} from "@/types";

const now = Date.now();

let mockSnippets: Snippet[] = [
  {
    id: "mock-1",
    type: "text",
    content: "Welcome to ClipDrop — your clipboard, everywhere.",
    lang: null,
    title: null,
    pinned: true,
    sensitive: false,
    expires_at: null,
    device_id: "dev-1",
    device_name: "This device",
    created_at: now - 60000,
    updated_at: now - 60000,
    file: null,
  },
  {
    id: "mock-2",
    type: "code",
    content: 'func main() {\n  fmt.Println("synced")\n}',
    lang: "go",
    title: "main.go",
    pinned: false,
    sensitive: false,
    expires_at: now + 3600000,
    device_id: "dev-2",
    device_name: "MacBook",
    created_at: now - 3600000,
    updated_at: now - 3600000,
    file: null,
  },
  {
    id: "mock-3",
    type: "link",
    content: "https://linear.app",
    lang: null,
    title: null,
    pinned: false,
    sensitive: false,
    expires_at: null,
    device_id: "dev-1",
    device_name: "This device",
    created_at: now - 7200000,
    updated_at: now - 7200000,
    file: null,
  },
];

const mockWorkspaceId = "ws-mock";
const mockDeviceId = "dev-1";
const mockToken = "mock-jwt-token";

const listeners = new Set<(snippet: Snippet) => void>();

export const mockApi = {
  createSession(): SessionCreateResponse {
    return {
      token: mockToken,
      expires_at: now + 7 * 24 * 3600000,
      workspace_id: mockWorkspaceId,
      device_id: mockDeviceId,
    };
  },

  getSession(): SessionInfo {
    return {
      workspace_id: mockWorkspaceId,
      device_id: mockDeviceId,
      device_name: "This device",
      devices: [
        {
          id: mockDeviceId,
          name: "This device",
          platform: "web",
          last_seen_at: Date.now(),
          online: true,
        },
        {
          id: "dev-2",
          name: "MacBook",
          platform: "web",
          last_seen_at: Date.now() - 120000,
          online: false,
        },
      ],
    };
  },

  listSnippets(): SnippetsListResponse {
    return {
      items: [...mockSnippets].sort((a, b) => b.created_at - a.created_at),
      next_cursor: null,
    };
  },

  createSnippet(
    partial: Partial<Snippet> & { type: Snippet["type"]; content: string },
  ): Snippet {
    const snippet: Snippet = {
      id: `mock-${Date.now()}`,
      type: partial.type,
      content: partial.content,
      lang: partial.lang ?? null,
      title: partial.title ?? null,
      pinned: false,
      sensitive: partial.sensitive ?? false,
      expires_at: partial.expires_at ?? null,
      device_id: mockDeviceId,
      device_name: "This device",
      created_at: Date.now(),
      updated_at: Date.now(),
      file: partial.file ?? null,
    };
    mockSnippets = [snippet, ...mockSnippets];
    listeners.forEach((fn) => fn(snippet));
    return snippet;
  },

  deleteSnippet(id: string): void {
    mockSnippets = mockSnippets.filter((s) => s.id !== id);
  },

  pinSnippet(id: string, pinned: boolean): Snippet | undefined {
    mockSnippets = mockSnippets.map((s) =>
      s.id === id ? { ...s, pinned, updated_at: Date.now() } : s,
    );
    return mockSnippets.find((s) => s.id === id);
  },

  initPairing(): PairingInitResponse {
    const token = "MOCKPAIR";
    return {
      token,
      expires_at: Date.now() + 300000,
      qr_url: `${typeof window !== "undefined" ? window.location.origin : ""}/pair?token=${token}`,
      poll_url: `/api/v1/pairing/${token}/status`,
    };
  },

  pairingStatus(): PairingStatusResponse {
    return { status: "pending" };
  },

  createShare(): ShareCreateResponse {
    return {
      share_id: "demo-share",
      url: `${typeof window !== "undefined" ? window.location.origin : ""}/share/demo-share`,
      expires_at: null,
    };
  },

  getPublicShare(id: string): Snippet | null {
    if (id === "demo-share") return mockSnippets[0] ?? null;
    return mockSnippets.find((s) => s.id === id) ?? null;
  },

  subscribe(fn: (snippet: Snippet) => void): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  simulateRemoteSnippet(): void {
    const snippet = mockApi.createSnippet({
      type: "text",
      content: `Synced from another device at ${new Date().toLocaleTimeString()}`,
    });
    snippet.device_name = "MacBook";
    snippet.device_id = "dev-2";
  },
};
