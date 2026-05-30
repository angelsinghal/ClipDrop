# ClipDrop

Universal cross-device clipboard sync — installable Progressive Web App (PWA).

## Documentation

| Document | Description |
|----------|-------------|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, folder structure, Docker, implementation phases, deployment |
| [docs/REDIS_SCHEMA.md](docs/REDIS_SCHEMA.md) | Redis keys, TTLs, pub/sub |
| [docs/API.md](docs/API.md) | REST API specification |
| [docs/WEBSOCKET_EVENTS.md](docs/WEBSOCKET_EVENTS.md) | WebSocket protocol |
| [docs/PRODUCTION_DEPLOYMENT.md](docs/PRODUCTION_DEPLOYMENT.md) | Production architecture, deployment, security, scaling |

## Status

- Architecture docs: complete
- **Frontend PWA:** `frontend/` (Next.js 15, mock mode by default)
- Backend: not yet implemented

### Frontend quick start

```bash
cd frontend && npm install && npm run dev
```

Open http://localhost:3000 — works with `NEXT_PUBLIC_MOCK_API=true` without backend.

## Quick start (after implementation)

```bash
cp .env.example .env
docker compose up --build
```

- Web: http://localhost
- API health: http://localhost/api/v1/health

## Stack

- **Frontend:** Next.js 15, TypeScript, Tailwind, shadcn/ui, Zustand, PWA
- **Backend:** Go, Gin, Gorilla WebSocket, Redis (go_commons log/json)
- **Infra:** Docker, Docker Compose, Nginx
