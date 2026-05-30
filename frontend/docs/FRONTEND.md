# ClipDrop Frontend

Next.js 15 PWA for cross-device clipboard sync.

## 1. Folder structure

```
frontend/
├── public/
│   ├── manifest.json          # PWA manifest
│   ├── sw.js                  # Generated service worker (build)
│   ├── icons/                 # App icons (192, 512, maskable)
│   └── offline fallback via /offline route
├── src/
│   ├── app/                   # App Router
│   │   ├── (app)/             # Authenticated shell
│   │   │   ├── dashboard/
│   │   │   ├── pair/
│   │   │   └── settings/
│   │   ├── share/[id]/        # Public share (no shell)
│   │   └── offline/
│   ├── components/
│   │   ├── ui/                # shadcn primitives
│   │   ├── layout/            # AppShell, ConnectionBadge
│   │   ├── snippets/          # Cards, filters, composer
│   │   ├── pairing/           # QR display & scanner
│   │   ├── pwa/               # Install prompt, offline banner
│   │   ├── session/           # Session bootstrap
│   │   └── dashboard/
│   ├── hooks/                 # React Query + WS + install
│   ├── lib/                   # api, ws, clipboard, mock
│   ├── providers/             # QueryClient, Theme, Toaster
│   ├── stores/                # Zustand
│   └── types/
├── scripts/generate-icons.mjs
└── next.config.ts             # PWA + standalone output
```

## 2. Component hierarchy

```
RootLayout
└── AppProviders (React Query, Theme, Sonner)
    ├── /share/[id] → SharePage (standalone)
    ├── /offline → OfflinePage
    └── (app)/layout
        └── SessionBootstrap
            └── AppShell
                ├── OfflineBanner
                ├── Header + ConnectionBadge
                ├── Sidebar / Bottom nav
                └── Page
                    ├── DashboardClient
                    │   ├── InstallPrompt
                    │   ├── ClipComposer → Dropzone
                    │   ├── SnippetFilters
                    │   └── SnippetList → SnippetCard[]
                    │       └── CodeBlock (shiki)
                    ├── PairPageClient
                    │   ├── QrDisplay
                    │   └── QrScanner
                    └── SettingsPage
                        └── InstallPrompt
```

## 3. Zustand stores

| Store | File | Responsibility |
|-------|------|----------------|
| `useSessionStore` | `stores/session-store.ts` | JWT, workspace/device IDs (persisted) |
| `useSnippetsStore` | `stores/snippets-store.ts` | Snippet list, filters, WS status |
| `useUiStore` | `stores/ui-store.ts` | Install prompt, online, settings (partial persist) |

## 4. API layer

`src/lib/api.ts` — typed client aligned with `docs/API.md`.

- `ApiClientError` for HTTP errors
- `MOCK_API=true` routes to `src/lib/mock.ts` for local dev without backend

React Query hooks in `src/hooks/use-snippets.ts` and `use-session.ts` wrap mutations/queries.

## 5. WebSocket client

`src/lib/ws.ts` — `ClipDropWebSocket` class:

- Connects with JWT query param
- Heartbeat `ping` / `pong` every 30s
- Handles `sync.push`, `sync.delete`, device/presence events
- Exponential backoff reconnect
- Mock mode uses in-process pub/sub via `mockApi.subscribe`

`useWebSocket()` hook wires events into Zustand snippet store.

## 6. PWA setup

| Piece | Implementation |
|-------|----------------|
| Plugin | `@ducanh2912/next-pwa` in `next.config.ts` |
| Manifest | `public/manifest.json` + metadata in `layout.tsx` |
| Service worker | Auto-generated `public/sw.js` on `npm run build` |
| Install prompt | `InstallPrompt` + `useInstallPrompt` (`beforeinstallprompt`) |
| Offline | Document fallback `/offline`; `OfflineBanner` when `navigator.onLine` false |
| Icons | `public/icons/*` — run `node scripts/generate-icons.mjs` |
| Splash | `theme_color`, `background_color`, `appleWebApp` meta |
| Background sync | Periodic sync registration attempted on dashboard (Chrome experimental) |

PWA is **disabled in development**; test with `npm run build && npm start`.

## 7. Tailwind theme

Dark-first Linear/Raycast palette in `src/app/globals.css`:

- Background `#09090b`, primary accent `#8b5cf6`
- CSS variables mapped via `@theme inline` (Tailwind v4)
- `next-themes` locked to dark for MVP

## 8. Responsive layouts

- **Mobile-first:** bottom tab nav, collapsible sidebar overlay
- **md+:** persistent sidebar, hover actions on snippet cards
- **Safe areas:** `env(safe-area-inset-*)` on body
- **max-w-5xl** content column centered

## 9. Error & loading states

| Location | Pattern |
|----------|---------|
| Session init | Full-screen spinner / retry |
| Dashboard / Pair | Route `loading.tsx` skeletons |
| Snippet list | `SnippetListSkeleton` |
| Mutations | Sonner toasts |
| Share page | Not found + CTA |
| API errors | `ApiClientError` message in toast |

## 10. Offline caching strategy

| Asset | Strategy |
|-------|----------|
| App shell (JS/CSS) | Precached by Workbox (build) |
| Pages | NetworkFirst, 5s timeout, 24h cache |
| Images | CacheFirst, 30d |
| `/api/v1/*` | **NetworkOnly** (never cache API) |
| Document offline | Fallback to `/offline` route |

On reconnect: React Query `refetchOnWindowFocus`; WS auto-reconnects and client should refetch snippets (via query invalidation on WS events).

## Run locally

```bash
cd frontend
cp .env.example .env.local   # MOCK_API=true by default
npm install
npm run dev                  # http://localhost:3000
```

Production PWA:

```bash
npm run build
npm start
```

Point `NEXT_PUBLIC_MOCK_API=false` when backend is available.
