# Instagram scheduler, draft release

This feature is OFF by default. No production settings are changed by this PR.

## Scope
- Professional account publishing on app 40085646374415585, separate from the messaging app.
- Single JPEG photo, MP4 Reel, or 2–20-image/video carousel.
- Explicit account, exact UTC instant plus device timezone, caption, two-step confirmation.
- PostgreSQL queue, cancellation before processing, processing/published/needs-attention status.
- Public HTTPS media from an operator-configured exact host allowlist. No ephemeral /uploads.
- Streamed byte/type/size validation and SHA-256 content check again before creating containers.
- No automatic retries after ambiguous writes. A crash or lost result requires checking Instagram before rescheduling.
- A schedule delayed over 30 minutes stops. Worker checks at one-minute cadence; it is not an exact-second promise.

## Deployment gates
1. Owner approves UI and says to merge/deploy. Keep PR draft until the remaining checks pass.
2. Full production build and disposable-PostgreSQL integration/concurrency tests must pass in a suitably sized CI runner.
3. Configure a separate Unified Login config with instagram_basic, instagram_manage_insights, instagram_content_publish. Keep existing analytics config 1692089839019107 untouched.
4. Set INSTAGRAM_PUBLISH_CONFIG_ID to the checked config. Add its publishing scope to Meta review only with a working demo.
5. Set INSTAGRAM_PUBLISH_MEDIA_HOSTS to exact durable HTTPS asset hosts controlled/trusted by the operator, without scheme or path. DNS/network egress must disallow private networks. Signed URL lifetimes must cover scheduling. A host allowlist alone does not prevent rebinding by a malicious host operator.
6. Set INSTAGRAM_PUBLISH_ENABLED=true only after the above. This enables the table migration, routes and minute worker. Existing new-app secret/encryption variables are reused, never messaging credentials.
7. Reconnect explicitly through the publishing action. Existing analytics-only token cannot publish. Existing analytics keeps working on either checked config. Reconnect invalidates previous queued grants for safety.
8. Obtain approval for exact test media, caption, Instagram account and publish time. Real Meta tests have NOT been run in this PR. Verify resulting media in Instagram and record the real response.

## Caveats and follow-up
- URL-based media v1, no managed media uploader yet. Asset URLs are stored in the authenticated user's queue; avoid sensitive signed URL parameters in captions/logs.
- JPEG/MP4 headers and max size are validated. Full codec, duration, dimensions, aspect-ratio and copyright/music eligibility are not inspected locally; Meta may reject unsupported assets, which stops visibly. Do not claim full media validation.
- Byte fingerprint reduces accidental asset substitution but Meta fetches the URL separately; immutable versioned URLs are required operationally.
- No edits/retry endpoint. Cancel pending schedule and create a fresh confirmed one. A job already processing cannot be cancelled.
- Poll budget is five status checks, one minute apart. Container expiry/processing error stops the job.
- Per-account rate limit is read from Meta, not a hard-coded assumption. The official guide currently says 100 in its rate-limit section and 50 in an older carousel paragraph; use live quota_total.
- Multiple worker processes claim work using PostgreSQL SKIP LOCKED. Concurrent token removal/account changes are checked again before the final publish, but no distributed transaction can atomically revoke a request already sent to Meta.
- End-user status refresh is manual page reload in v1. No promise of real-time push updates.
- This is a draft release, not production-ready until the deployment gates above are met.

## Verification
- Existing baseline: 200 pass, 3 skipped.
- With scheduler tests: 209 pass, 3 skipped.
- Scheduler-specific TypeScript and server bundling pass.
- Full app default check/build exhausted memory or exceeded local execution time. Client modules transform successfully, but chunk rendering has not completed here.
- Sample-data UI verified visually at 320, 390, 1280 and interactively without production endpoints.
- Private demo: https://files.instinct.com/kz6o8jeb591s-oravini-instagram-scheduler-preview

Official source checked 23 November 2026:
https://developers.facebook.com/documentation/instagram-platform/content-publishing
