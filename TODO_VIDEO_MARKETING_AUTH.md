# Video Marketing Auth + Tier Gating — TODO

## Goal
When users visit `/video-marketing`:
1. Unauthed → public marketing landing (current behavior)
2. Authed but plan not in {pro, elite} (Tier 4/5) → upgrade gate
3. Authed + Tier 4/5 → full in-platform view (webinars, host webinar, videos, recordings, landing pages, analytics)

Plus: "Sign in" button on the marketing page routes through `/login?redirect=video-marketing` which brings users back to `/video-marketing` after login.

## Tasks

- [x] Plan approved
- [ ] Create `TierGate.tsx` — reusable upgrade-gate screen (Tier 4/5)
- [ ] Create `PlatformView.tsx` — authenticated Oravini Video Marketing platform (tabs + host flow)
- [ ] Update `PublicNav.tsx` — route sign-in links to `/login?redirect=video-marketing`, show logged-in state
- [ ] Update `Hero.tsx` + `UpcomingWebinars.tsx` CTAs to use the redirect param
- [ ] Update `Login.tsx` — honor `redirect=video-marketing` after successful auth (password + Google)
- [ ] Refactor `VideoMarketing.tsx` to branch on auth + tier
- [ ] Smoke test in dev

## Tier Mapping
- Tier 4 → plan `pro`
- Tier 5 → plan `elite`
- Allowed plans: `['pro', 'elite']`
