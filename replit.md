# Brandverse Client Portal

## Overview

Brandverse Client Portal is a SaaS-style dashboard web application built for coaches and consultants to manage their clients in one place. The platform enables the admin (Brandverse) to upload documents, share call recordings, track client progress, send reminders, and communicate with clients through a built-in chat system. Clients get their own dashboard to view documents, track progress, review call feedback, and chat with their coach.

**Key features:**
- Role-based access: Admin panel and Client dashboard
- Document management (recordings, summaries, contracts, worksheets, etc.)
- Materials Library: admin-uploaded shared resources visible to all clients
- Progress tracking with visual progress bars
- Call feedback system (two-way: admin and client submit feedback)
- Real-time chat via WebSockets with image/file upload support
- Notification/reminder system
- Tracking hub: /tracking shows 4 cards in grid (Content Metrics, Competitor Study, Sales [soon], Ad [soon])
- Content Metrics: /tracking/content shows 3 big cards (Instagram, YouTube, Calendar)
- Instagram Tracking: month-by-month grid, click month → full month dashboard with daily post grouping
- YouTube Tracking: same month-by-month structure as Instagram
- Per-post engagement rate auto-calculated: (likes+comments+saves)/views*100, color-coded badge
- Per-post metric update stages: Initial, 2-Week, 4-Week (via MetricsUpdateDialog with tabs)
- Per-post Instagram auto-sync: Zap/Regenerate button expands inline panel with Initial/2W/4W checkpoints, each with Sync button that fetches live metrics from Instagram via Apify; sync timestamps tracked per checkpoint (initialSyncedAt, twoWeekSyncedAt, fourWeekSyncedAt)
- Visual analytics charts: bar chart (monthly views), pie chart (content type breakdown), line chart (engagement trend)
- AI Report Generator: date range picker (Quick Range: 1W/2W/4W + Custom From/To) instead of static period selector; posts filtered by date range; animated loading then OpenRouter-powered report with summary, insights, recommendations
- Content Calendar: /tracking/content/calendar shows posts visually on a calendar
- AI Content Ideas: /ai-ideas with Gemini, copy/heart-save per idea
- Admin Calendar: /admin/calendar with full monthly calendar, Calendly bookings, call feedback events
- Calendly integration: webhook at /api/webhooks/calendly auto-stores bookings, matches to client accounts
- Course Modules section on dashboard with "Coming Soon" placeholder cards
- Instagram Profile Setup: dashboard card (data-testid="instagram-setup-card") — enter Instagram URL or @handle → Apify scrapes last 30 posts → posts auto-synced to content tracking → OpenRouter AI generates niche/audience/engagement/recommendations report; saved per-client in instagram_profile_reports table; GET /api/instagram/profile-report + POST /api/instagram/analyze-profile; Re-analyse button to refresh anytime
- DM Tracker: /dm-tracker (client) and /admin/dm-tracker (admin) — manual Instagram lead CRM; pipeline view (New/Warm/Hot/Cold columns), list view, quick reply templates with copy button; add/edit/delete leads with name, handle, status, source, notes, last contact, follow-up date; admin has client selector to filter by client; status: new/hot/warm/cold/converted/lost; API: GET/POST/PATCH/DELETE /api/dm/leads, GET/POST/DELETE /api/dm/quick-replies; tables: dm_leads, dm_quick_replies
- Competitor Study: /tracking/competitor — AI-powered Instagram profile comparison; enter your URL + competitor URL, scrapes both via Apify, generates side-by-side metrics + OpenRouter AI analysis (strengths, weaknesses, competitor edge, action plan, content gaps); saves analyses to DB; delete individual reports
- Auto-sync cron: node-cron job in server/cron.ts, runs daily at 3AM UTC, syncs Instagram post stats via Apify by age bracket (initial <14d, 2w 14-28d, 4w 28-35d); also accessible via POST /api/admin/auto-sync
- AI Content Coach: /ai-coach — animated interactive coach character (floating emoji face, mood states: weak/decent/strong/thinking), chat-style interface with speech bubbles, script analysis with score ring + metric bars + issue cards, Fix This Line / Generate Hooks / Make It Viral / Retention Warning quick actions, Pre-Post Check mode, Competitor Intel mode (Apify scrape + AI analysis), real-time conversation history, improved script panel; backend: POST /api/coach/chat, /api/coach/fix-line, /api/coach/improve-script, /api/coach/competitor; powered by Groq JSON mode
- Sidebar: "Tracking" link + separate "Competitor Study" link, "AI Content Ideas" link, "AI Content Coach" link
- Admin sidebar: Calendar link added
- Auto metric-reminder notification created on each content post log (48-72 hour prompt)
- Income goal tracking: set goal on first join via auto-open dialog; displays on dashboard
- Dashboard: world clocks bar at top, Daily Quote + Income Goal cards, Course Modules section
- Admin Content Tracking (/admin/tracking): client selector + Instagram/YouTube tabs + per-client reports
- Session-based authentication with Passport.js
- Admin ClientDetail: 7-tab view including Content tab (content posts + income goal per client)

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

- **Framework:** React 18 with TypeScript, using Vite as the build tool
- **Routing:** Wouter (lightweight client-side router) with protected routes for auth and role gating
- **State Management / Data Fetching:** TanStack React Query v5 — all API calls use `apiRequest` helper and are cached via query keys that match the API URL paths
- **UI Component Library:** shadcn/ui (New York style) built on top of Radix UI primitives
- **Styling:** Tailwind CSS v3 with CSS variables for theming (light/dark mode ready), custom color tokens defined in `index.css`
- **Forms:** React Hook Form with `@hookform/resolvers` and Zod for validation

**Page structure:**
- `client/src/pages/Login.tsx` — Login page
- `client/src/pages/client/` — Client-facing pages (Dashboard, Documents, Chat, Progress, Calls)
- `client/src/pages/admin/` — Admin pages (Dashboard, Clients, ClientDetail, Chat, Documents)
- `client/src/components/layout/ClientLayout.tsx` and `AdminLayout.tsx` — Sidebar layouts for each role

**Path aliases:**
- `@/` → `client/src/`
- `@shared/` → `shared/`
- `@assets/` → `attached_assets/`

### Backend Architecture

- **Runtime:** Node.js with Express 5 (TypeScript, ESM modules)
- **Entry point:** `server/index.ts` — sets up Express, sessions, Passport, and routes
- **Authentication:** Passport.js with `passport-local` strategy; passwords hashed using `scrypt` via Node.js crypto module; sessions stored in PostgreSQL via `connect-pg-simple`
- **WebSockets:** Native `ws` library attached to the same HTTP server at path `/ws`; used for real-time chat and notifications; clients are tracked in a `Map<userId, WebSocket>`
- **Routes:** Defined in `server/routes.ts`; middleware guards `requireAuth` and `requireAdmin` protect endpoints
- **File uploads:** `multer` handles multipart form data for document uploads
- **Database access:** `server/storage.ts` exposes an `IStorage` interface implemented with Drizzle ORM + `node-postgres`
- **Seed data:** `server/seed.ts` auto-runs on startup to create the admin account and sample clients if they don't exist

**Build process:** `script/build.ts` runs Vite for the frontend then esbuild for the server, bundling a specific allowlist of dependencies into `dist/index.cjs` for faster cold starts.

### Data Storage

- **Database:** PostgreSQL (required via `DATABASE_URL` environment variable)
- **ORM:** Drizzle ORM with `drizzle-kit` for migrations (`./migrations/` directory, schema at `shared/schema.ts`)
- **Session store:** PostgreSQL-backed sessions via `connect-pg-simple`

**Schema tables:**
- `users` — both admin and client accounts, with role enum (`admin` | `client`), program name, next call date, phone
- `documents` — files linked to a client and uploader; typed with `doc_type` enum (recording, summary, audit, strategy, worksheet, contract, material, other); fileType="material" = shared library resource
- `messages` — direct messages between users with read status, optional file attachment (fileUrl, fileName, fileMime)
- `progress` — per-client progress percentages for offer creation, funnel, content, monetization (unique per client)
- `call_feedback` — call records with recording URL, summary, admin feedback, client feedback + learnings
- `tasks` — action items per client with completion status
- `notifications` — dashboard notifications per user with read status
- `content_posts` — Instagram/YouTube post metrics per client (views, likes, comments, followers, revenue, postDate, funnelStage)
- `income_goals` — monthly income target and current income per client (unique per client)

All IDs use PostgreSQL `gen_random_uuid()` defaults.

### Authentication & Authorization

- Session cookies (7-day expiry, `httpOnly`) stored server-side in Postgres
- Two roles: `admin` and `client`
- `requireAuth` middleware checks session; `requireAdmin` additionally checks role
- After login, users are redirected to `/admin` or `/dashboard` based on role
- Frontend `useAuth` hook queries `/api/auth/me`; unauthenticated responses return `null` gracefully

### Real-time Communication

- WebSocket server on `/ws` path; clients connect with `?userId=<id>` query param
- Server maintains a map of active WebSocket connections keyed by userId
- Used for chat message delivery and notifications

## External Dependencies

### Core Runtime Dependencies
| Package | Purpose |
|---|---|
| `express` v5 | HTTP server and API routing |
| `drizzle-orm` + `pg` | PostgreSQL ORM and driver |
| `passport` + `passport-local` | Authentication strategy |
| `express-session` + `connect-pg-simple` | Server-side session management in Postgres |
| `ws` | WebSocket server for real-time chat |
| `multer` | File upload handling |
| `zod` + `drizzle-zod` | Schema validation and type inference |

### Frontend Dependencies
| Package | Purpose |
|---|---|
| `react` + `react-dom` | UI framework |
| `wouter` | Client-side routing |
| `@tanstack/react-query` v5 | Server state management and caching |
| `@radix-ui/*` | Accessible UI primitives (full suite) |
| `tailwindcss` | Utility-first CSS |
| `class-variance-authority` + `clsx` + `tailwind-merge` | Dynamic class utilities |
| `react-hook-form` + `@hookform/resolvers` | Form handling |
| `date-fns` | Date formatting |
| `recharts` | Charts for progress visualization |
| `lucide-react` | Icon library |
| `embla-carousel-react` | Carousel component |
| `vaul` | Drawer component |
| `cmdk` | Command palette |

### Development / Build Tools
| Package | Purpose |
|---|---|
| `vite` + `@vitejs/plugin-react` | Frontend dev server and bundler |
| `esbuild` | Server bundler for production |
| `tsx` | TypeScript execution for dev server |
| `drizzle-kit` | Database schema migrations and push |
| `@replit/vite-plugin-runtime-error-modal` | Dev error overlay |
| `@replit/vite-plugin-cartographer` | Replit-specific dev tool |

### Environment Variables Required
- `DATABASE_URL` — PostgreSQL connection string (required; app throws on startup without it)
- `SESSION_SECRET` — Session signing secret (falls back to hardcoded string if not set; should be set in production)