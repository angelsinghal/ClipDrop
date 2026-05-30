# ClipDrop — REST API Specification

**Base URL:** `https://{host}/api/v1`  
**Content-Type:** `application/json` unless multipart  
**Auth:** `Authorization: Bearer <jwt>`

---

## Common types

### Snippet

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "type": "text",
  "content": "hello world",
  "lang": null,
  "title": null,
  "pinned": false,
  "sensitive": false,
  "expires_at": null,
  "device_id": "...",
  "device_name": "MacBook",
  "created_at": 1716900000000,
  "updated_at": 1716900000000,
  "file": null
}
```

### FileRef

```json
{
  "id": "...",
  "name": "diagram.png",
  "mime": "image/png",
  "size": 10240,
  "url": "/api/v1/files/{id}"
}
```

### Error

```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests"
  }
}
```

**HTTP status:** 400 validation, 401 auth, 403 forbidden, 404 not found, 413 payload too large, 429 rate limit, 500 internal.

---

## Endpoints

### `GET /health`

Liveness. Returns `{ "status": "ok" }`.

### `GET /ready`

Checks Redis. Returns `{ "status": "ready", "redis": "up" }` or 503.

---

### `POST /session`

Create anonymous session and first device.

**Body (optional)**

```json
{
  "device_name": "Chrome on Linux",
  "platform": "web"
}
```

**Response 201**

```json
{
  "token": "eyJ...",
  "expires_at": 1717500000000,
  "workspace_id": "uuid",
  "device_id": "uuid"
}
```

---

### `POST /session/refresh`

**Response 200** — new token, same ids.

---

### `GET /session/me`

**Response 200**

```json
{
  "workspace_id": "uuid",
  "device_id": "uuid",
  "device_name": "string",
  "devices": [ { "id", "name", "platform", "last_seen_at", "online" } ]
}
```

---

### `GET /devices`

List devices in workspace.

---

### `DELETE /devices/:device_id`

Remove device. Cannot remove last device. Publishes `device.left`.

---

### `POST /pairing/init`

**Response 201**

```json
{
  "token": "8-char-or-longer",
  "expires_at": 1716900300000,
  "qr_url": "https://app.clipdrop.example/pair?token=...",
  "poll_url": "/api/v1/pairing/{token}/status"
}
```

---

### `GET /pairing/:token/status`

For initiator polling.

```json
{ "status": "pending|completed|expired", "device": { ... } }
```

---

### `POST /pairing/confirm`

**Auth:** Bearer optional if new session created in same request.

**Body**

```json
{
  "token": "...",
  "device_name": "iPhone",
  "platform": "ios"
}
```

**Response 200**

```json
{
  "token": "eyJ...",
  "workspace_id": "uuid",
  "device_id": "uuid"
}
```

---

### `POST /pairing/cancel`

Cancels pending pairing for current device as initiator.

---

### `GET /snippets`

**Query**

| Param | Description |
|-------|-------------|
| `cursor` | Opaque pagination cursor |
| `limit` | Default 50, max 100 |
| `type` | Filter by type |
| `pinned` | `true` only pinned |

**Response**

```json
{
  "items": [ /* Snippet[] */ ],
  "next_cursor": "..."
}
```

---

### `POST /snippets`

**Body**

```json
{
  "type": "text",
  "content": "string",
  "lang": "go",
  "title": "optional",
  "sensitive": false,
  "expires_in_sec": 3600,
  "file_id": "optional-after-upload"
}
```

**Response 201** — Snippet object. Triggers `sync.push` on WS.

---

### `GET /snippets/:id`

---

### `PATCH /snippets/:id`

**Body** — partial: `title`, `pinned`, `expires_in_sec`, `sensitive`.

---

### `DELETE /snippets/:id`

**Response 204.** Triggers `sync.delete`.

---

### `POST /snippets/:id/pin` / `DELETE /snippets/:id/pin`

Toggle pin without full PATCH.

---

### `POST /files`

`multipart/form-data`, field `file`.

**Response 201**

```json
{
  "id": "...",
  "name": "...",
  "mime": "...",
  "size": 1234,
  "url": "/api/v1/files/..."
}
```

---

### `GET /files/:id`

Streams bytes with `Content-Type` and `Content-Disposition`.

---

### `POST /shares`

**Body**

```json
{
  "snippet_id": "uuid",
  "expires_in_sec": 86400
}
```

**Response 201**

```json
{
  "share_id": "abc123xyz",
  "url": "https://app.clipdrop.example/share/abc123xyz",
  "expires_at": null
}
```

---

### `GET /shares/:id`

**Public.** Returns sanitized snippet (no workspace ids).

---

### `DELETE /shares/:id`

Revoke. **Auth required**, must own workspace.

---

## WebSocket upgrade

`GET /ws?token=<jwt>`

On success, server sends:

```json
{
  "type": "connected",
  "payload": { "workspace_id": "...", "device_id": "..." }
}
```

Client should reply with `subscribe` within 5s.

See [WEBSOCKET_EVENTS.md](./WEBSOCKET_EVENTS.md).

---

## Rate limits (default)

| Route group | Limit |
|-------------|-------|
| `POST /session` | 10 / min / IP |
| `POST /pairing/*` | 20 / min / device |
| `POST /snippets` | 60 / min / device |
| `GET /shares/:id` | 30 / min / IP |
| Global | 120 / min / IP |
