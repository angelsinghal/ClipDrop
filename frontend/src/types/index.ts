export type SnippetType = "text" | "code" | "link" | "image" | "file";

export interface FileRef {
  id: string;
  name: string;
  mime: string;
  size: number;
  url: string;
}

export interface Snippet {
  id: string;
  type: SnippetType;
  content: string;
  lang: string | null;
  title: string | null;
  pinned: boolean;
  sensitive: boolean;
  expires_at: number | null;
  device_id: string;
  device_name: string;
  created_at: number;
  updated_at: number;
  file: FileRef | null;
}

export interface Device {
  id: string;
  name: string;
  platform: string;
  last_seen_at: number;
  online?: boolean;
}

export interface SessionInfo {
  workspace_id: string;
  device_id: string;
  device_name: string;
  devices: Device[];
}

export interface SessionCreateResponse {
  token: string;
  expires_at: number;
  workspace_id: string;
  device_id: string;
}

export interface SnippetsListResponse {
  items: Snippet[];
  next_cursor: string | null;
}

export interface PairingInitResponse {
  token: string;
  expires_at: number;
  qr_url: string;
  poll_url: string;
}

export type PairingStatus = "pending" | "completed" | "expired";

export interface PairingStatusResponse {
  status: PairingStatus;
  device?: Device;
}

export interface ShareCreateResponse {
  share_id: string;
  url: string;
  expires_at: number | null;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}

export type WsMessageType =
  | "connected"
  | "subscribed"
  | "pong"
  | "sync.push"
  | "sync.delete"
  | "device.joined"
  | "device.left"
  | "presence.changed"
  | "error";

export interface WsEnvelope<T = unknown> {
  type: WsMessageType | string;
  payload: T;
  ts?: number;
  request_id?: string;
}

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
