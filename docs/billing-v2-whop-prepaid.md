# Billing v2: Whop prepaid terms (Oravini AI)

Status: **implemented behind kill switches. Not launched.** Checkout and fulfillment stay
closed until a finalized catalog is configured. The discount percentages for Growth and
Growth+Video are not final.

## How it works

1. `POST /api/billing/v2/checkout` with `{planId, termMonths}`. The user comes from the session.
   Every other body field is ignored. The server checks eligibility under the user row
   lock, stores an immutable offer snapshot from the server catalog, and creates a Whop
   checkout configuration for the existing one-time plan. Its metadata carries
   `oravini_checkout_id`.
2. The customer pays on Whop with a one-time charge. Whop never renews it.
3. Two paths run the same fulfillment pipeline (`server/billing/service.ts`):
   - a signed webhook: `POST /api/webhooks/whop/billing-v2`, using Standard Webhooks HMAC with ±5 min tolerance and dedupe by webhook id;
   - browser reconciliation: `POST /api/billing/v2/reconcile {paymentId}`, called by the same authenticated user.

   The pipeline re-fetches the payment from the Whop API and checks business, product,
   variant, `paid` status, refund/dispute flags, exact amount in cents and currency, and
   binding to our checkout and its owner. It then runs `fulfillVerifiedPayment`, which is
   idempotent: the Whop payment id is the primary key.
4. Access runs for calendar months in UTC, anchored to the payment time and clamped at
   month end. For example, Jan 31 → Feb 29 → Mar 31. Each month `credit_balances.monthly_credits`
   is reset to the snapshot allowance (base + term bonus). Months are never added together
   and never caught up. Bonus credits are never touched.
5. At the end of the term the account becomes gated Free. The remaining paid monthly allowance
   is removed. If the account hasn't had a Free grant this calendar month, it gets Free
   100/month. Purchased bonus credits stay.

The refresh runs in the authenticated session middleware, `/api/auth/me`, `/api/credits`,
`/api/billing/v2/me`, and every `storage.upsertCreditBalance` / `deductCredits` /
`activatePlanCredits` / `refundCredits` call.

### Lock order, used on every v2 path

`users FOR UPDATE` → `billing_checkouts_v2` → `billing_payments_v2` →
`billing_entitlements_v2` → `billing_period_grants_v2` / `oravini_free_grants_v2` →
`credit_balances`. Any error rolls back the whole transaction.

### Policies, all fail-safe

| Event | Behaviour |
|---|---|
| Duplicate / replayed webhook or reconcile | `already-fulfilled`, no new grant |
| Pending / open / draft / failed payment | rejected, nothing written. Retrying after it is paid works |
| Amount, currency, product, variant or business mismatch | rejected, nothing written |
| Payment with no Oravini checkout binding (legacy subscription, other products) | ignored. Never grants, never cancels |
| Account mismatch (redirect opened by another logged-in user) | 403, nothing written |
| Second prepaid term while one is active | checkout returns 409 `existing-term` with `endsAt`. A payment that still arrives is stored as `needs_review / existing-term` for manual refund or extension. Paid time is never silently discarded |
| Full **or partial** refund, dispute | payment marked, active entitlement revoked, paid allowance removed, account returns to gated Free, bonus kept. Still processed when the fulfillment kill switch is off |
| Dispute won / refund reversed | **no automatic restore**. Manual |
| Whop membership cancel/expire events | ignored. Oravini owns calendar expiry |
| Legacy `/api/auth/cancel-plan` | 409 for v2 accounts (nothing renews). Unchanged for legacy |
| Legacy paid subscribers (starter/growth/pro not in `billing_accounts_v2`) | keep the legacy contract and `PLAN_CREDITS`. Cannot buy prepaid until deliberately migrated (`legacy-subscriber-migration-required`) |
| Admin, Elite | never enrolled. Existing rights and unlimited handling unchanged |

## Environment variables (names only)

| Name | Purpose |
|---|---|
| `BILLING_V2_CHECKOUT_ENABLED` | `true` allows new Whop checkouts. Default off |
| `BILLING_V2_FULFILLMENT_ENABLED` | `true` lets webhooks/reconcile grant access. Default off. Refund revocation works without it |
| `BILLING_V2_FREE_ENROLLMENT_ENABLED` | `true` moves legacy Free accounts to Free v2 (100 per calendar month instead of the legacy daily 20). Default off |
| `WHOP_ENVIRONMENT` | `production` or `sandbox`. Unset defaults to `production`; any other value fails closed. Never accepts arbitrary URLs |
| `WHOP_COMPANY_ID` | Oravini AI Whop business id (`biz_…`). Must equal the catalog `companyId` |
| `WHOP_API_KEY` | server Whop API key. Needs payment read and checkout-configuration create |
| `WHOP_WEBHOOK_SECRET` | webhook signing secret |
| `WHOP_PREPAID_CATALOG_JSON` | finalized catalog (below) |
| `BILLING_V2_CHECKOUT_REDIRECT_URL` | optional Whop return URL, e.g. the pricing page |

`GET /api/billing/v2/status` shows the gate state, selected `environment` (`null` when invalid)
and reason codes publicly. It never shows IDs, URLs or secrets. The two allowed bases are
`https://api.whop.com/api/v1` for `production` and `https://sandbox-api.whop.com/api/v1`
for `sandbox`; supplying a sandbox catalog/key without `WHOP_ENVIRONMENT=sandbox` is not a
valid sandbox test.

### Catalog JSON (all 12 paid offers are required, or the gate stays closed)

```json
{
  "catalogVersion": "2027-01-v1",
  "discountVersion": "disc-2027-01",
  "businessName": "Oravini AI",
  "companyId": "biz_…",
  "discountFinal": true,
  "discounts": {
    "growth":       {"1": 0, "3": 0, "6": 0, "12": 0},
    "growth_video": {"1": 0, "3": 0, "6": 0, "12": 0},
    "pro":          {"1": 0, "3": 0, "6": 0, "12": 0}
  },
  "offers": [
    {"planId": "growth", "termMonths": 3, "whopProductId": "prod_…", "whopPlanId": "plan_…",
     "planType": "one_time", "currency": "usd", "amountCents": 0}
  ]
}
```

Validation rejects the catalog for any of:
- `discountFinal` not `true`
- a business name other than "Oravini AI" (anything containing PLUXA)
- a company id that differs from the env value
- a missing or duplicate offer, or a duplicate variant id
- a non-`one_time` plan or non-USD currency
- a Pro or 1-month discount other than 0
- `amountCents` that differs from `round(base × months × (100 − discount))`

Allowances and rights are always derived from `shared/pricingV2.ts`, never read from the JSON.

## Schema rollout / rollback

No migration runs at startup. Do not run against production until review is complete.

```bash
DATABASE_URL=… npx tsx script/billing-v2-migrate.ts status
DATABASE_URL=… npx tsx script/billing-v2-migrate.ts apply --confirm
```

- Adds only new tables (`billing_*_v2`, `oravini_free_grants_v2`), indexes and immutability triggers. Legacy tables are not altered.
- The migration is repeat-safe (`IF NOT EXISTS`, `CREATE OR REPLACE`, `DROP TRIGGER IF EXISTS`) and runs in one transaction.
- Before the tables exist, every account is legacy: the v2 code treats `42P01` as legacy.

Recommended rollout order:
1. Staging migrate.
2. Configure env with `WHOP_ENVIRONMENT=sandbox` and a sandbox catalog.
3. Verify field names against real Whop sandbox payments and webhooks.
4. Enable fulfillment.
5. Enable checkout.
6. Optionally enable Free enrollment.

Operational rollback: set the kill switches to `false`. The ledger is kept, and active
v2 terms keep their monthly grants because the session/credit refresh still runs for
enrolled accounts.

Destructive rollback (drops the v2 ledger, export it first):

```bash
DATABASE_URL=… npx tsx script/billing-v2-migrate.ts rollback --confirm-destroy-v2-ledger
```

Enrolled users keep whatever `users.plan` and `credit_balances` values they had at that
moment, and fall back to the legacy reset path.

## Current contract review and remaining launch gates

The local review corrected the payment and checkout integration against the current
2026-11-20 API schema at https://api.whop.com/api/v1/openapi.json:

- Requests pin `Api-Version-Date: 2026-11-20`. Checkout creation sends `account_id`
  and an existing `variant_id`, with an idempotency key derived from the server checkout.
- Payments use flat `account_id`, `product_id`, `variant_id` and
  `checkout_configuration_id`. Both metadata ownership and the persisted Whop checkout
  configuration must match before fulfillment. An early webhook is deferred for retry.
- Money fields contain an exact decimal-string `amount`, currency and precision.
  Parsing rejects malformed, negative, unsafe and sub-cent inputs. Exclusive tax is
  separated from the sold catalog amount before the ledger's second price check.
  Buyer fees are not treated as the offer price. Unknown tax behavior fails closed.
- HMAC verification uses the literal UTF-8 bytes of the entire signing secret, including
  its prefix, matching the current official SDK helper. Tests include a separately
  calculated signature instead of trusting only the production test-signing helper.
- `WHOP_ENVIRONMENT` selects one of two fixed API bases; mock-fetch tests prove the exact
  host, version pin and idempotency header for each, and route tests prove the selected
  environment reaches the client factory. An invalid value fails closed on checkout,
  reconcile and webhook revocation without constructing a client or making an API call.
- A verified refund/dispute for a known v2 checkout now writes a durable payment-row
  tombstone after checking the server-fetched payment's business, product, variant and
  checkout metadata/configuration against the persisted immutable snapshot. A stale or
  delayed paid response for the same payment sees the tombstone and cannot grant access.
  Duplicate reversals are replay-safe; mismatched checkout binding is rejected before any
  write; unknown legacy/other-product payments stay ignored. No new v2 account is enrolled
  and purchased bonus credits are untouched.
- The session middleware keeps its short per-user cache, but caps a v2 entry at the next
  paid `periodEnd`/`endsAt` or the next UTC calendar month for Free, using one injected
  clock value per request. A request at an exact paid-period boundary resets that month's
  allowance; at exact term expiry it removes paid access and refreshes the Free state.
  Refresh errors are never cached. Legacy accounts keep the cheap cached path.
- The customer-facing pricing view hides the internal AI provider-cost and margin planning
  paragraph (`className="cost"`); those notes remain only in the labelled review preview.
  Prices, draft discounts, allowances, the service offering and the disabled booking link
  are unchanged.

The independent full local suite passes 193 tests after the durable-reversal,
middleware-boundary and preview-only cost-note regressions; focused billing typecheck
passes with inherited ES2017 settings. A dedicated local
reproducer for the out-of-order refund/fulfillment race reports zero active entitlements,
and deterministic database tests cover reversal-before-fulfillment, delayed/stale paid
responses, dispute ordering, duplicate reversals, wrong binding, legacy isolation and
exact-boundary cache expiry. These are local results with contract-shaped fixtures, not a
Whop sandbox payment.

Still required before any launch:
- Complete a real sandbox checkout, signed webhook, redirect reconciliation, refund and
  dispute validation. Confirm real zero-tax and inclusive-tax receipt shapes, metadata
  propagation and API-key permission coverage.
- Complete a final-head production build and full-project typecheck. The full build is still
  uncleared: one attempt timed out during chunk rendering and a constrained-heap attempt
  OOMed. A later memory-constrained build transformed all 3,684 client modules, then timed
  out during chunk rendering after 110 seconds. The full-project typecheck also exhausted
  a 1,536 MB heap; only the focused billing typecheck passes.
- Obtain final discount and product-policy decisions, including partial-refund revocation,
  dispute restoration, UTC boundaries and same-month Free allowance after term expiry.
- Review manual-admin plan changes for an enrolled account, which are overwritten by
  entitlement refresh except for admin/Elite exclusions.

No source review or local test result authorizes production, catalog or payment changes.
Unknown shapes fail closed.
