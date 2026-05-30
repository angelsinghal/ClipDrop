# ClipDrop Backend

## 1) Backend architecture

- `cmd/server/main.go`: server bootstrap, config, redis init.
- `internal/routes`: Gin route registration and middleware composition.
- `internal/handlers`: HTTP + WebSocket handlers (transport layer).
- `internal/services`: domain logic (sessions, snippets, files, pairing, share, presence).
- `internal/redis`: key strategy and redis connection.
- `internal/websocket`: scalable hub + Redis pub/sub bridge.
- `internal/middleware`: auth, request-id, rate limit.
- `internal/models` + `internal/utils`: DTOs and shared helpers.

## 2) Redis schema

- `clipdrop:session:{session_id}` -> hash with workspace/device.
- `clipdrop:ws:{workspace_id}:devices` -> hash device json.
- `clipdrop:ws:{workspace_id}:snippets` -> zset of snippet IDs.
- `clipdrop:snippet:{snippet_id}` -> json blob.
- `clipdrop:ws:{workspace_id}:pinned` -> set.
- `clipdrop:filemeta:{file_id}` + `clipdrop:file:{file_id}` -> metadata + bytes.
- `clipdrop:pair:{token}` -> pending pairing token.
- `clipdrop:share:{share_id}` -> public share metadata.
- `clipdrop:presence:{workspace_id}` -> presence hash.
- `clipdrop:channel:ws:{workspace_id}` -> pubsub channel.

## 3) WebSocket event payloads

- `sync.push`: `{ snippet, source_device_id }`
- `sync.delete`: `{ snippet_id }`
- `device.joined`: `{ device }` or `{ device_id }`
- `device.left`: `{ device_id }`

All wrapped in `{ type, payload, ts }`.

## 4) Connection lifecycle

1. Client requests `GET /api/v1/ws` with JWT.
2. Server upgrades and registers connection in workspace room.
3. Server emits `connected`.
4. Heartbeat via ping/pong every 30s (90s timeout).
5. On disconnect, presence updated and `device:disconnected` published.

## 5) Reconnection strategy

- Client uses exponential backoff (`1s -> 30s max`).
- On reconnect call `GET /snippets?limit=50` to reconcile.
- Dedupe on `snippet.id` and `updated_at`.

## 6) Redis pub/sub architecture

- API mutation publishes event to `channel:ws:{workspace}`.
- Every backend instance pattern-subscribes to `channel:ws:*`.
- Hub fans out to local websocket clients in same workspace.
- `exclude_device_id` avoids echoing to source device.

## 7) Error handling strategy

- Unified envelope: `{ error: { code, message } }`.
- Input errors -> `400`, auth errors -> `401`, forbidden -> `403`, rate limit -> `429`.
- Handler/service boundaries keep domain errors explicit.

## 8) Dockerfile

- Multi-stage build (`golang:1.23-alpine` -> `distroless`).
- Output binary: `/app/clipdrop`.

## 9) Environment config

See `backend/.env.example` for full list:

- `REDIS_URL`, `JWT_SECRET`, `JWT_TTL`, `MAX_FILE_SIZE`, `MAX_SNIPPET_SIZE`
- `RATE_LIMIT_RPM`, `PAIRING_TTL`, `PUBLIC_BASE_URL`, `CORS_ORIGINS`

## 10) Production scaling strategy

- Stateless API pods behind load balancer.
- Shared Redis for data + pubsub.
- No sticky sessions needed.
- Separate Redis connection pools for commands/pubsub in high scale.
- Add metrics and traces around ws connection counts, pubsub lag, redis RTT.
