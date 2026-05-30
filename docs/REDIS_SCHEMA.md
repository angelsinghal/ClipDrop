# ClipDrop — Redis Schema

All keys use prefix `clipdrop:` in production to avoid collisions on shared Redis instances.

```
CLIPDROP_PREFIX=clipdrop:
```

---

## Key reference

### Sessions

```
clipdrop:session:{session_id}          → HASH
clipdrop:device:{device_id}            → HASH (reverse lookup)
```

**`session:{session_id}` fields**

| Field | Type | Description |
|-------|------|-------------|
| `workspace_id` | string | UUID |
| `device_id` | string | UUID |
| `created_at` | int | Unix ms |
| `last_seen_at` | int | Unix ms |

**TTL:** none (session lives until explicit logout or 90d idle cleanup job)

**`device:{device_id}` fields**

| Field | Type |
|-------|------|
| `session_id` | string |
| `workspace_id` | string |
| `name` | string | User-editable label |
| `platform` | string | `web`, `ios`, `android`, `desktop` |
| `user_agent` | string | Truncated |

---

### Workspaces

```
clipdrop:ws:{workspace_id}                    → HASH
clipdrop:ws:{workspace_id}:devices            → HASH  (device_id → JSON)
clipdrop:ws:{workspace_id}:snippets           → ZSET  (score = created_at_ms)
clipdrop:ws:{workspace_id}:pinned               → SET
```

**`ws:{workspace_id}` fields**

| Field | Description |
|-------|-------------|
| `created_at` | Unix ms |
| `owner_device_id` | First device |
| `snippet_count` | Denormalized counter (optional) |

---

### Snippets

```
clipdrop:snippet:{snippet_id}                 → HASH (or JSON STRING)
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | UUID |
| `workspace_id` | string | |
| `device_id` | string | Source device |
| `type` | string | `text`, `code`, `link`, `image`, `file` |
| `content` | string | Text or URL or base64 ref |
| `file_id` | string | Optional, if type file/image |
| `lang` | string | Code language |
| `title` | string | Optional |
| `pinned` | bool | `0`/`1` |
| `sensitive` | bool | Shorter TTL |
| `expires_at` | int | Unix ms, 0 = never |
| `created_at` | int | |
| `updated_at` | int | |

**Indexes**

- Membership: `ws:{workspace_id}:snippets` ZSET
- Pin: `ws:{workspace_id}:pinned` SET

**TTL**

- If `expires_at > 0`: `EXPIREAT` on `snippet:{id}` and remove from ZSET via lazy delete on read or keyspace notification subscriber.

**Default limits**

- History: max 500 snippets per workspace (trim oldest on insert).
- `content` max 64 KB text; images/files use `file:{id}`.

---

### Files

```
clipdrop:file:{file_id}                       → STRING (binary) or HASH { url, size, mime }
```

| Field | Description |
|-------|-------------|
| `mime` | image/png, application/pdf, etc. |
| `size` | bytes |
| `name` | original filename |
| `workspace_id` | owner |

**TTL:** Same as parent snippet `expires_at`, or 7d default for non-expiring file snippets.

**Max size MVP:** 256 KB (configurable).

---

### Device pairing

```
clipdrop:pair:{token}                         → STRING (JSON)
```

**Value JSON**

```json
{
  "workspace_id": "uuid",
  "initiator_device_id": "uuid",
  "status": "pending|completed|expired",
  "created_at": 1716900000000
}
```

**TTL:** 300 seconds (5 minutes)

**Flow**

1. Init creates `pair:{token}` with status `pending`.
2. Confirm updates status `completed`, stores `joiner_device_id`, publishes event.
3. Poll endpoint reads same key.

---

### Public shares

```
clipdrop:share:{share_id}                     → HASH
```

| Field | Description |
|-------|-------------|
| `snippet_id` | source |
| `workspace_id` | for revoke auth |
| `created_by` | device_id |
| `view_count` | int |
| `expires_at` | optional |
| `revoked` | bool |

**TTL:** Optional; if set, matches `expires_at`.

**Public ID:** URL-safe 12–16 char nanoid (separate from internal snippet UUID).

---

### Presence

```
clipdrop:presence:{workspace_id}              → HASH
```

| Field | device_id → JSON |
|-------|------------------|
| `last_seen_at` | int |
| `status` | `online` \| `away` |
| `device_name` | string |

**TTL per field:** Use hash + periodic cleanup, or `EXPIRE` on whole key refreshed by heartbeat every 60s.

---

### Rate limiting

```
clipdrop:rl:{identifier}:{window}             → STRING (counter)
```

- `identifier`: IP or `device_id`
- `window`: minute bucket `202405281430`

**TTL:** 120 seconds

---

### JWT deny list (optional logout)

```
clipdrop:jwt:bl:{jti}                         → STRING "1"
```

**TTL:** Remaining JWT lifetime

---

## Pub/Sub channels

```
clipdrop:channel:ws:{workspace_id}
```

**Message payload (JSON)**

```json
{
  "event": "sync.push",
  "payload": { "snippet": { } },
  "origin_instance": "host-abc",
  "exclude_device_id": "optional-uuid"
}
```

Hub subscribers on each API instance forward to local WebSocket connections.

---

## Keyspace notifications (optional)

Enable `notify-keyspace-events Ex` in Redis to run cleanup when `snippet:*` expires (remove from ZSET). Alternative: lazy cleanup on list API.

---

## Memory estimation (rough)

| Item | Size |
|------|------|
| Snippet metadata + 1KB text | ~2 KB |
| 500 snippets / workspace | ~1 MB |
| 10k active workspaces | ~10 GB (+ files if stored in Redis) |

Plan object storage before large file adoption.
