# Instagram Unified Login, new app only

App: 40085646374415585. Configuration: 1692089839019107.
This does not consume or change META_APP_* credentials or the messaging connection.

## Configuration

Required: INSTAGRAM_UNIFIED_APP_SECRET, INSTAGRAM_UNIFIED_CONFIG_ID,
INSTAGRAM_UNIFIED_REDIRECT_URI=https://oravini.com/api/instagram/unified/callback,
INSTAGRAM_UNIFIED_CONFIG_APPROVED=true only after verifying the actual Meta configuration.
Token encryption uses INSTAGRAM_UNIFIED_TOKEN_ENCRYPTION_KEY (64 hexadecimal characters),
or the existing TOKEN_ENCRYPTION_KEY. Never replace a key already used for encrypted data.
Optional: INSTAGRAM_UNIFIED_GRAPH_VERSION (default v27.0).

First review permissions: instagram_basic and instagram_manage_insights only.
No publishing, messages, ads, AI analysis or competitor private metrics in this feature.

## Endpoints to register after deployment

- OAuth: /api/instagram/unified/callback
- Signed deauthorization POST: /api/instagram/unified/deauthorize
- Signed data-deletion POST: /api/instagram/unified/data-deletion
- Public instructions: /data-deletion
- Privacy: /privacy
- Terms: /terms

Signed requests are checked with this app's HMAC-SHA256 secret. Deletion is scoped to
this app and exact verified identifiers. /me is the business integration system user,
not the human Facebook user. If the OAuth callback provides a valid signed_request,
its login subject is saved separately. Confirm identity matching with a real Meta
removal request before advertising automated callback coverage. Never guess a match
from a username, a business ID or an unrelated messaging-app identifier. The public
instructions and support email provide the documented alternative.
Confirmation pages contain no user identifiers, tokens or metrics. Codes are random
and only hashes are stored. Callback replay is safe. Local removal does not revoke
Meta authorization or remove Instagram posts. User deletion cascades these tables.

## Checks

New unit/HTTP tests plus disposable PostgreSQL integration tests cover code exchange,
single-use state, session/owner binding, encryption, account selection, sync cooldown,
snapshots, isolation, signed removal and cascade deletion. Set only
IG_UNIFIED_TEST_DATABASE_URL to a disposable database to run the integration test;
it creates and drops its own temporary schema. Do not set it to production.

Local production build exceeded a 768 MB heap; 1280 MB build reached chunk rendering
but hit the 90-second guard. CI uses a 6 GB heap and must pass before merge/deploy.
The separately compiled actual view rendered at 320, 390, 1280 px with sample data.
That is not evidence of a real Meta connection. Enable, test OAuth, sync actual
account metrics, remove, reconnect, and test signed deletion after deployment.

## Official references

https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-unified-login/get-started
https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-unified-login
https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback
