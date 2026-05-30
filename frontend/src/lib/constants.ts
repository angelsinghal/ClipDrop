export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";

export const WS_BASE =
  process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8080/api/v1/ws";

export const MOCK_API = process.env.NEXT_PUBLIC_MOCK_API === "true";

export const SESSION_STORAGE_KEY = "clipdrop_session";
export const SETTINGS_STORAGE_KEY = "clipdrop_settings";

export const MAX_UPLOAD_BYTES = 256 * 1024;

export const SNIPPET_TYPE_LABELS: Record<string, string> = {
  text: "Text",
  code: "Code",
  link: "Link",
  image: "Image",
  file: "File",
};
