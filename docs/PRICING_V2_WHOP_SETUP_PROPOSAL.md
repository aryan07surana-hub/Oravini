# Pricing v2, proposed Whop setup, not approved for creation

No Whop mutation, checkout, database migration or live grant is part of this PR.
Existing subscribers, Starter19USD, Elite and admin remain unchanged.
Business: biz_QVd19objTRqb1X. Product: prod_Ndxcq3luL9Adr.

Prepare12 NEW versioned plan variants,3paid plan families x4terms. Do NOT edit
existing variant prices or credit mappings: those may belong to existing users.
Final naming can use the labels below plus a v2 revision marker.

| Proposed name | Term months | Upfront USD (DRAFT discounts) | Credits each month |
| --- | ---: | ---: | ---: |
| Growth v2,1month |1|49.00|400|
| Growth v2,3months |3|132.30|550|
| Growth v2,6months |6|249.90|600|
| Growth v2,12months |12|441.00|650|
| Pro v2,1month |1|59.00|700|
| Pro v2,3months |3|177.00|850|
| Pro v2,6months |6|354.00|900|
| Pro v2,12months |12|708.00|950|
| Growth+Video v2,1month |1|69.00|1000|
| Growth+Video v2,3months |3|186.30|1150|
| Growth+Video v2,6months |6|351.90|1200|
| Growth+Video v2,12months |12|621.00|1250|

Free100 is an internal free entitlement, not a paid Whop variant. It resets to100eachmonth, no rollover; one grant per account per monthly period. Existing bonus-credit balances are preserved separately.
Work with us: no fixed-price Whop plan, custom upfront amount agreed separately,
unlimited credits and work directly with the team. No invented price/services.

Growth no video/webinars. Pro includes10GBoccupied video storage/30GBmonthly
streaming. Growth+Video includes5GB/15GB. These are proposed usage limits, not
provider purchases or already-enforced runtime quotas. Credits are app
entitlements in Oravini, not native Whop credit units or money.

## Approval and integration gates

- User approval to go live and exact3/6/12month discount numbers, currently10/15/25%
  for Growth and Growth+Video only; Pro0%.
- Confirmed:1/3/6/12 real calendar months. API billing intervals have been observed in days, so do not substitute30/90/180/365. Use exact server-side access boundaries and confirm a matching supported Whop charging mode before creation.
- Automatic renewal or fixed prepaid expiry, cancellation/refund/tax treatment and
  final checkout totals must be agreed, not invented. Displayed table excludes tax.
- No existing variant is replaced, archived or modified before a migration plan.
- Approved versioned variant IDs must be fetched from Whop and mapped server-side
  to immutable plan+term+credit schedule. No reuse of old variant IDs for larger
  new grants. No client-controlled price, allowance, add-on or entitlement input.
- Activation must verify actual successful Whop payment, owner business/product,
  amount/currency, buyer/order binding, and payment idempotency in one transaction.
  Return URLs never grant access. The earlier confirm-plan security guard remains.
- Persist subscription entitlement version, verified period start/end and monthly
  allowance; reset monthly within access term, not whole-term upfront. Current
  storage resets by plan string and has no term subscription record. This PR
  prepares the schedule but deliberately does not wire it into grants/resets.
- Existing Elite/admin accounts and subscriber entitlements remain unchanged.
- Provider-dollar AI caps remain proposals, not active limit enforcement.19.70USD
  optional cap is not an all-in65%margin promise, especially at discounted terms.

Official reference read for preparation:
https://docs.whop.com/api-reference/variants/create-variant
The exact current API/schema and final merchant state must be revalidated before
any creation. No API key is read or used by this PR.

Free grant proposal uses a transaction, user-row lock, and unique(account,month) ledger. Migration and wiring are NOT executed; no endpoint allows claiming arbitrary account IDs. Calendar boundaries are UTC purchase-time anniversaries, month-end clamped from original anchor. Business timezone policy must be shown before launch.
