# Brandverse Client Portal

## Overview

The Brandverse Client Portal is a SaaS-style web application designed for coaches and consultants to efficiently manage their clients. It provides a centralized platform for document sharing, call recording management, client progress tracking, communication via a built-in chat system, and a notification/reminder system. Both administrators (Brandverse) and clients have dedicated dashboards tailored to their specific needs, enabling seamless interaction and progress monitoring.

The platform aims to enhance client-coach relationships by streamlining administrative tasks and providing powerful tools for content tracking, AI-powered analytics, and lead management. Key capabilities include:

- **Role-based dashboards:** Separate interfaces for admins and clients.
- **Comprehensive document management:** For various file types including shared materials.
- **Advanced content tracking:** Detailed metrics and auto-sync features for Instagram and YouTube posts.
- **AI-powered insights:** Report generation, content idea generation, video editing, and a sophisticated AI Content Coach.
- **CRM for DMs:** A lead management system for Instagram DMs with pipeline views and quick replies.
- **Competitor analysis:** AI-driven comparison of Instagram profiles.
- **Integrated scheduling:** Calendly webhook for booking management.
- **Real-time communication:** WebSocket-based chat with file support.

The business vision is to empower coaches and consultants with a robust, all-in-one solution that reduces overhead, improves client engagement, and drives better results through data-driven insights and intelligent automation.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

The frontend is built with **React 18 and TypeScript** using **Vite** for fast development and bundling. **Wouter** handles client-side routing, providing protected routes based on authentication and user roles. **TanStack React Query v5** manages server state and data fetching, utilizing query keys for caching based on API URL paths.

For UI components, the application leverages **shadcn/ui**, which is built on **Radix UI primitives**, offering a modern "New York style" aesthetic. **Tailwind CSS v3** is used for styling, with custom CSS variables and color tokens supporting theming (light/dark mode). **React Hook Form** with **Zod** provides robust form handling and validation.

The project structure separates client and admin-facing pages, with dedicated layout components for each role (`ClientLayout.tsx`, `AdminLayout.tsx`). Path aliases (`@/`, `@shared/`, `@assets/`) simplify module imports.

### Backend Architecture

The backend runs on **Node.js with Express 5 (TypeScript, ESM modules)**. The entry point (`server/index.ts`) initializes Express, session management, Passport.js, and routes. **Passport.js** with a `passport-local` strategy handles authentication, using `scrypt` for password hashing and `connect-pg-simple` for session storage in PostgreSQL.

Real-time communication, primarily for chat and notifications, is facilitated by the native **`ws` library**, integrated directly with the Express HTTP server at the `/ws` path. User connections are tracked for efficient message delivery. API routes, defined in `server/routes.ts`, are protected by middleware (`requireAuth`, `requireAdmin`) to enforce authorization. **Multer** is used for handling file uploads.

Database interactions are abstracted through an `IStorage` interface, implemented with **Drizzle ORM** and `node-postgres`. A `server/seed.ts` script ensures initial setup of admin and sample client accounts. The build process uses Vite for the frontend and esbuild for the backend, bundling dependencies for optimized production deployment.

### Data Storage

The application uses **PostgreSQL** as its primary database, configured via the `DATABASE_URL` environment variable. **Drizzle ORM** is used for object-relational mapping, with `drizzle-kit` managing database migrations. Session data is also stored in PostgreSQL using `connect-pg-simple`.

Key database tables include:
- `users`: Stores both admin and client accounts with role distinctions.
- `documents`: Manages uploaded files, categorized by type and linked to clients.
- `messages`: Stores chat messages, supporting file attachments.
- `progress`: Tracks client-specific progress percentages across various categories.
- `call_feedback`: Records feedback for client calls.
- `content_posts`: Stores detailed metrics for Instagram and YouTube posts.
- `income_goals`: Tracks client income targets.
- `dm_leads`: Manages Instagram DM leads for CRM functionality.
- `dm_quick_replies`: Stores quick reply templates for DM management.
- `instagram_profile_reports`: Stores AI-generated Instagram profile analyses.

All IDs are generated using PostgreSQL's `gen_random_uuid()`.

### Authentication & Authorization

Authentication is session-based, using `httpOnly` cookies with a 7-day expiry, stored server-side in PostgreSQL. The system supports two roles: `admin` and `client`. `requireAuth` middleware verifies user sessions, while `requireAdmin` specifically checks for administrative privileges. Users are redirected to appropriate dashboards (`/admin` or `/dashboard`) post-login. The frontend uses a `useAuth` hook to query authentication status.

### Real-time Communication

A WebSocket server, operating on the `/ws` path, manages real-time chat and notification delivery. The server maintains a mapping of active WebSocket connections to user IDs, enabling direct and efficient communication.

## External Dependencies

### Core Runtime Dependencies
- `express` v5: HTTP server and API routing.
- `drizzle-orm` + `pg`: PostgreSQL ORM and driver.
- `passport` + `passport-local`: Authentication strategy.
- `express-session` + `connect-pg-simple`: Server-side session management.
- `ws`: WebSocket server for real-time features.
- `multer`: File upload handling.
- `zod` + `drizzle-zod`: Schema validation and type inference.
- `node-cron`: Scheduled tasks (e.g., auto-sync).

### AI/API Integrations
- **Apify:** For scraping Instagram data (e.g., initial profile analysis, competitor study, fallback for post metrics).
- **OpenRouter:** Powers AI report generation, Instagram niche/audience analysis, and competitor analysis.
- **Gemini (Google AI):** Used for AI Content Ideas (`GOOGLEEDITOR_API_KEY`). Note: AI Video Editor was migrated from Gemini to Groq.
- **Runware:** Ultra-fast AI image generation (`RUNWARE_API_KEY`). Used in AI Video Editor to generate 4 thumbnail concepts (`POST /api/video/generate-images`) and storyboard frames for each shot in the Shot List. WebSocket-based API (`wss://ws.runware.ai/v1`), model `runware:100@1` (FLUX.1-Schnell), output as WEBP URLs.
- **YouTube Data API v3:** For fetching YouTube video and channel statistics (`YOUTUBE_API_KEY`). Also used to enrich YouTube URL context in the AI Video Editor.
- **Meta Graph API:** Primary API for Instagram post statistics and profile information (token management, `ACCESS_TOKEN`).
- **Groq:** Powers the AI Content Coach, AI Video Editor (Idea Builder + Analyze + Template Suggest + Chat Edit + Suggest Audio + Generate Captions — 6 endpoints), and various AI functions using `llama-3.3-70b-versatile` in JSON mode.
- **Calendly Webhooks:** For integrating scheduling and booking data.

### Frontend Dependencies
- `react` + `react-dom`: UI framework.
- `wouter`: Client-side routing.
- `@tanstack/react-query` v5: Server state management and caching.
- `@radix-ui/*`: Accessible UI primitives.
- `tailwindcss`: Utility-first CSS.
- `react-hook-form` + `@hookform/resolvers`: Form handling.
- `date-fns`: Date formatting.
- `recharts`: Charts for data visualization.
- `lucide-react`: Icon library.

### Environment Variables Required
- `DATABASE_URL`: PostgreSQL connection string.
- `SESSION_SECRET`: Session signing secret.
- `YOUTUBE_API_KEY`: YouTube Data API v3 key.
- `GOOGLEEDITOR_API_KEY`: Google AI Studio API key for Gemini.
- `APIFY_API_TOKEN`: Apify API key.
- `OPENROUTER_API_KEY`: OpenRouter API key.
- `GROQ_API_KEY`: Groq API key.
- `CALENDLY_WEBHOOK_SECRET`: Secret for Calendly webhook validation.