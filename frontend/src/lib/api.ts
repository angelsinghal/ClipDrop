import { API_BASE, MOCK_API } from "@/lib/constants";
import { mockApi } from "@/lib/mock";
import type {
  ApiError,
  FileRef,
  PairingInitResponse,
  PairingStatusResponse,
  SessionCreateResponse,
  SessionInfo,
  ShareCreateResponse,
  Snippet,
  SnippetsListResponse,
} from "@/types";

export class ApiClientError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  token?: string | null;
  formData?: FormData;
};

async function request<T>(
  path: string,
  { method = "GET", body, token, formData }: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body && !formData) headers["Content-Type"] = "application/json";

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: formData ? formData : body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let message = res.statusText;
    let code: string | undefined;
    try {
      const err = (await res.json()) as ApiError;
      message = err.error?.message ?? message;
      code = err.error?.code;
    } catch {
      /* empty */
    }
    throw new ApiClientError(message, res.status, code);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  health: () => request<{ status: string }>("/health"),

  createSession(body?: {
    device_name?: string;
    platform?: string;
  }): Promise<SessionCreateResponse> {
    if (MOCK_API) return Promise.resolve(mockApi.createSession());
    return request("/session", { method: "POST", body: body ?? {} });
  },

  refreshSession(token: string): Promise<SessionCreateResponse> {
    if (MOCK_API) return Promise.resolve(mockApi.createSession());
    return request("/session/refresh", { method: "POST", token });
  },

  getSession(token: string): Promise<SessionInfo> {
    if (MOCK_API) return Promise.resolve(mockApi.getSession());
    return request("/session/me", { token });
  },

  listSnippets(
    token: string,
    params?: { cursor?: string; limit?: number; type?: string; pinned?: boolean },
  ): Promise<SnippetsListResponse> {
    if (MOCK_API) return Promise.resolve(mockApi.listSnippets());
    const q = new URLSearchParams();
    if (params?.cursor) q.set("cursor", params.cursor);
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.type) q.set("type", params.type);
    if (params?.pinned) q.set("pinned", "true");
    const qs = q.toString();
    return request(`/snippets${qs ? `?${qs}` : ""}`, { token });
  },

  createSnippet(
    token: string,
    body: {
      type: string;
      content: string;
      lang?: string;
      title?: string;
      sensitive?: boolean;
      expires_in_sec?: number;
      file_id?: string;
    },
  ): Promise<Snippet> {
    if (MOCK_API) {
      return Promise.resolve(
        mockApi.createSnippet({
          type: body.type as Snippet["type"],
          content: body.content,
          lang: body.lang ?? null,
          title: body.title ?? null,
          sensitive: body.sensitive,
          expires_at: body.expires_in_sec
            ? Date.now() + body.expires_in_sec * 1000
            : null,
        }),
      );
    }
    return request("/snippets", { method: "POST", token, body });
  },

  deleteSnippet(token: string, id: string): Promise<void> {
    if (MOCK_API) {
      mockApi.deleteSnippet(id);
      return Promise.resolve();
    }
    return request(`/snippets/${id}`, { method: "DELETE", token });
  },

  pinSnippet(token: string, id: string, pin: boolean): Promise<Snippet> {
    if (MOCK_API) {
      const s = mockApi.pinSnippet(id, pin);
      if (!s) throw new ApiClientError("Not found", 404);
      return Promise.resolve(s);
    }
    return request(`/snippets/${id}/pin`, {
      method: pin ? "POST" : "DELETE",
      token,
    });
  },

  uploadFile(token: string, file: File): Promise<FileRef> {
    if (MOCK_API) {
      return Promise.resolve({
        id: `file-${Date.now()}`,
        name: file.name,
        mime: file.type || "application/octet-stream",
        size: file.size,
        url: URL.createObjectURL(file),
      });
    }
    const formData = new FormData();
    formData.append("file", file);
    return request("/files", { method: "POST", token, formData });
  },

  initPairing(token: string): Promise<PairingInitResponse> {
    if (MOCK_API) return Promise.resolve(mockApi.initPairing());
    return request("/pairing/init", { method: "POST", token });
  },

  pairingStatus(token: string, pairToken: string): Promise<PairingStatusResponse> {
    if (MOCK_API) return Promise.resolve(mockApi.pairingStatus());
    return request(`/pairing/${pairToken}/status`, { token });
  },

  confirmPairing(body: {
    token: string;
    device_name?: string;
    platform?: string;
  }): Promise<SessionCreateResponse> {
    if (MOCK_API) return Promise.resolve(mockApi.createSession());
    return request("/pairing/confirm", { method: "POST", body });
  },

  createShare(token: string, snippetId: string, expiresInSec?: number): Promise<ShareCreateResponse> {
    if (MOCK_API) return Promise.resolve(mockApi.createShare());
    return request("/shares", {
      method: "POST",
      token,
      body: { snippet_id: snippetId, expires_in_sec: expiresInSec },
    });
  },

  getPublicShare(shareId: string): Promise<Snippet> {
    if (MOCK_API) {
      const s = mockApi.getPublicShare(shareId);
      if (!s) throw new ApiClientError("Not found", 404);
      return Promise.resolve(s);
    }
    return request(`/shares/${shareId}`);
  },

  removeDevice(token: string, deviceId: string): Promise<void> {
    if (MOCK_API) return Promise.resolve();
    return request(`/devices/${deviceId}`, { method: "DELETE", token });
  },
};
