# ClipDrop Production + Deployment Guide

## 1) Production architecture

```mermaid
flowchart LR
  U[Users / PWA] --> CDN[CDN + Edge Cache]
  CDN --> FE[Vercel Next.js Frontend]
  FE --> API[Nginx -> Go API (Railway/Render/AWS)]
  API --> REDIS[(Redis Cloud / Self Hosted Redis)]
  API <--> WS[WebSocket Hub + Redis Pub/Sub]
  API --> OBS[Logs + Metrics + Alerts]
```

- Frontend serves static/app shell quickly from edge.
- Backend owns realtime, auth, snippets/files/share APIs.
- Redis is source of truth for sync state, TTL, pub/sub fanout.

## 2) Deployment guide

### A. Frontend (Vercel)
- Import `frontend/` as Vercel project.
- Env:
  - `NEXT_PUBLIC_API_URL=https://api.clipdrop.example/api/v1`
  - `NEXT_PUBLIC_WS_URL=wss://api.clipdrop.example/api/v1/ws`
  - `NEXT_PUBLIC_MOCK_API=false`
- Enable automatic preview deployments for PRs.

### B. Backend (Railway/Render/AWS ECS)
- Build from `backend/Dockerfile`.
- Set env from `backend/.env.example` with secure secrets.
- Configure healthcheck `GET /api/v1/health`.
- Minimum 2 replicas for zero-downtime rolling deploys.

### C. Redis (Redis Cloud or self-hosted)
- Enable AOF persistence.
- Restrict network access to backend private network.
- Monitor memory + connection count + latency.

## 3) Docker Compose setup

- Local stack: `docker-compose.yml`.
- Production-like stack: `docker-compose.prod.yml`.
- Includes:
  - Redis with persistence (`appendonly yes`)
  - Go backend
  - Next.js frontend container
  - Nginx reverse proxy

Run:
```bash
docker compose up --build
```

Prod-like:
```bash
docker compose -f docker-compose.prod.yml up -d
```

## 4) Nginx config

Provided in:
- `docker/nginx/nginx.conf`
- `docker/nginx/conf.d/clipdrop.conf`

Features:
- Reverse proxy `/` to frontend and `/api` + `/api/v1/ws` to backend.
- WebSocket upgrade headers.
- JSON access logs.
- Security headers.
- Gzip compression.
- TLS-ready (add certs and 443 server block in prod).

## 5) PWA optimization checklist

- [x] Manifest with icons + standalone mode.
- [x] Service worker enabled in production build.
- [x] Offline fallback route (`/offline`).
- [x] Network strategy: API network-only, assets cached.
- [x] Install prompt handling.
- [ ] Add real screenshots in manifest.
- [ ] Add real splash assets per device.
- [ ] Lighthouse PWA score >= 95 on mobile.

## 6) Security checklist

- JWT secret stored in secret manager (not repo).
- HTTPS everywhere (`wss://`, HSTS enabled).
- CORS locked to known frontend domains.
- Request size limits (`MAX_FILE_SIZE`, Nginx `client_max_body_size`).
- Rate limiting middleware enabled.
- Redis protected/private networking.
- No clipboard payloads in logs.
- Dependency scanning in CI (recommended add-ons).

## 7) Scalability strategy

- Stateless Go API instances behind load balancer.
- Redis pub/sub for cross-instance WS fanout.
- Keep WS connections distributed across replicas.
- Split Redis role at scale:
  - primary for writes
  - replica/read for analytics
- Move file blobs to object storage (S3) once traffic grows.

## 8) Monitoring strategy

- Health: `/api/v1/health`, readiness `/api/v1/ready`.
- Metrics hook: `/api/v1/metrics` (request/error counters).
- Nginx JSON access logs to centralized log stack (Loki/ELK/CloudWatch).
- Alerting:
  - elevated 5xx
  - increased WS disconnects
  - Redis latency/memory pressure

## 9) Performance optimization

- Keep websocket messages compact (avoid sending heavy payloads repeatedly).
- Use Redis pipelining (already used for snippet writes).
- Tune heartbeat intervals and proxy timeouts.
- Cache static assets aggressively at edge.
- Maintain small payload limits for mobile networks.
- Keep first load JS trimmed and leverage Next.js route splitting.

## 10) Future roadmap

### Near-term
- Prometheus + OpenTelemetry integration.
- Sentry error tracking for frontend/backend.
- Canary deployments and rollback automation.
- Blue/green deploy strategy for backend.

### Mid-term
- End-to-end encryption for sensitive snippets.
- Push notifications for new clip events.
- Object storage for larger files/images.
- Multi-region low-latency backend.

### Long-term
- User auth + workspace sharing.
- Enterprise audit logs and policy controls.
- Dedicated sync protocol optimizations (delta updates).
