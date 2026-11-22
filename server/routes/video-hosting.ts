import type { Express } from "express";

/**
 * Video hosting routes used to be duplicated here (collections, collection
 * items, chapters, CTAs, CTA clicks, viewers, viewer sessions and the
 * /api/video-events/:id/settings PATCH), without owner checks and accepting
 * request bodies verbatim. They are now registered once, owner-scoped and with
 * allowed-field payloads, by:
 *   - server/videoManagementRoutes.ts  (registerVideoManagementRoutes)
 *   - server/videoEventUpdate.ts       (registerVideoEventUpdateRoutes)
 *   - server/routes.ts                 (public CTA click tracking)
 *
 * The export is kept so existing imports and the call in routes.ts keep working;
 * registering nothing here also avoids shadowing or diverging from the
 * hardened handlers.
 */
export function registerVideoHostingRoutes(_app: Express, _requireAuth: any) {
  // Intentionally empty — see comment above.
}
