# Customer-session error compatibility

**Status:** staging acceptance complete; production untouched

## R7 acceptance checkpoint

R7 is accepted as a closed, read-only customer-account milestone. Its accepted
surface ends at the authenticated identity/customer relationship and its
explicit denied states. The verified staging target, credentialed QA evidence,
deterministic denied-state coverage, and read-only D1 aggregate evidence below
are the final acceptance record. R8 ownership projection is a separate
contract-first milestone and does not retroactively enlarge this endpoint or
R7's account surface.

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
- Git Preview `dpl_4r1nos7Qms2uUvrUQTrHpDuiYFjq` for commit
  `6225ef41bd461fcd26919967e76069de3fa5b9a6` is Ready. Both
  `staging.sonder.build` and the staging branch alias resolve to it. The earlier
  dirty custom-environment deployment is not an alias target.
- The signed-out account route redirected to `/login` with the `Sign in`
  header. The linked Magic Auth QA session rendered the connected state; the
  unlinked Google QA session rendered only the explicit unlinked state. Neither
  page rendered customer IDs, email, provider details, or commercial state.
- Sign-out returned the header to `Sign in` and kept `/account` protected.
- Read-only before/after D1 aggregates remained at 2 purchases, 4 entitlements,
  2 licenses, and 6 activations. The after query made zero writes. Its 17
  audit-event rows all predated the acceptance window; no audit change is
  attributed to R7.

## Deterministic acceptance evidence

The targeted API integration suite passes all 10 customer-session cases. It
verifies linked and unlinked outcomes, browser-claim spoofing resistance,
private no-store responses, no commercial mutation for unlinked reads, and the
distinct `accountDisabled` and `emailNotVerified` responses. These two denied
states are exercised deterministically because creating disabled identities or
unverified WorkOS users in staging would alter QA identity state without adding
customer-value evidence.

Production was not deployed or changed.
