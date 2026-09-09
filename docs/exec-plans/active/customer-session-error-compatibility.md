# Customer-session error compatibility

**Status:** deployed to staging; credentialed verification pending

## Goal and scope

Resolve the cross-repository `customer-session-403-consumer-collapse` mismatch
without beginning an account ownership, entitlement, license, activation,
device, billing, download, or profile feature.

## Implemented contract

- `401 { error: "unauthenticated" }` redirects the website to `/login`.
- `403 accountUnlinked`, `accountDisabled`, and `emailNotVerified` render
  distinct server-rendered states. Denied states do not render customer IDs,
  email, or other customer data.
- Unknown/malformed API responses fail closed to the generic unavailable state.
- The Worker responds with `Cache-Control: private, no-store`; the website's
  server-side request remains `cache: "no-store"`.

## Staging deployment evidence

- `sonder-api-staging` deployed version
  `6ff0cfc2-1f48-4a59-934d-cf9ba504a824` on 2026-09-09 from an isolated clean
  checkout containing only the cache-policy route change. No unrelated local
  API work was deployed.
- `GET /v1/customer/session` without credentials returned
  `401 { error: "unauthenticated" }` and `Cache-Control: private, no-store`.
- The Vercel target `staging` deployment
  `dpl_FCBepu35Sd2J3v99PMrBPp8HsNMq` built successfully and is Ready. A
  deployment-protected signed-out request reached `/account`, redirected to
  `/login`, and rendered the `Sign in` header state.
- The live Google control reached Google's account-selection page through the
  configured WorkOS callback. No QA account was selected or credentials entered.
- Two privacy-safe staging D1 snapshots agreed: 2 purchases, 4 entitlements,
  2 licenses, 6 device activations, and 10 commercial audit events. Both reads
  performed zero writes.

## Deterministic acceptance evidence

The targeted API integration suite passes all 10 customer-session cases. It
verifies linked and unlinked outcomes, browser-claim spoofing resistance,
private no-store responses, no commercial mutation for unlinked reads, and the
distinct `accountDisabled` and `emailNotVerified` responses. These two denied
states are exercised deterministically because creating disabled identities or
unverified WorkOS users in staging would alter QA identity state without adding
customer-value evidence.

## Remaining credentialed staging verification

Use the protected staging deployment and synthetic QA identities only:

1. With existing linked and unlinked QA credentials, complete Magic Auth and
   Google sign-in, then verify linked/unlinked account rendering, signed-in
   `Account` header, sign-out, and post-logout redirect.
2. Confirm the aggregate staging counts remain unchanged after that completed
   QA verification window.

Production was not deployed or changed.
