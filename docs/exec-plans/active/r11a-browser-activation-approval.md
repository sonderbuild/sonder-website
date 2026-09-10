# R11A — Browser activation approval surface

## Reconciled goal

Add the website-owned, server-side approval and denial presentation for the
deployed R10 activation-request lifecycle. The implementation follows the R9
browser activation contract without redefining entitlement, allocation, proof,
ticket, or capacity semantics, all of which remain `sonder-api` concerns.

## Observations

- R10 creates approval URLs at `/account/activate/{opaqueRequestId}` and its
  preview, approve, and deny endpoints require the established WorkOS bearer
  token. The Worker returns no ticket from approval or denial.
- The deployed preview exposes canonical product/name, device label, requested
  time, active count, and remaining slots. It does not expose expiry or a
  state field, so the website must not invent either; a successful preview is
  the only contract-backed pending presentation.
- The website already keeps that token in the sealed server session and calls
  the Worker server-to-server. Browsers must not receive the token or call the
  Worker.
- The existing custom Magic Auth and social flows always return to `/account`.
  R11A must preserve a safe opaque approval path through authentication.
- Existing same-origin CSRF cookie/header protection applies to browser
  mutations and will also guard the website's approval and denial relay.

## Implementation surface

1. Add `/account/activate/[activationRequestId]`, accepting only the opaque
   base64url request-ID form and rendering a provider-neutral preview or a
   fail-closed terminal/unavailable state.
2. Add website-local, CSRF-protected approval and denial routes. They obtain
   the sealed WorkOS token only on the server and relay only the minimal R10
   decision result to the browser.
3. Preserve the safe activation return path through Magic Auth and Google/Apple
   sign-in using strict same-origin path validation. No identity or token data
   is stored in a URL or browser-controlled identity field.
4. Cover page, decision-route, auth-return, privacy, CSRF, and account/auth
   regressions with focused tests, then execute the repository validation map.

## Verification plan

- Unit/integration tests for all R10 response states, auth denials, duplicate
  decisions, CSRF rejection, safe post-login routing, and non-leakage.
- `pnpm lint`, `pnpm test`, `pnpm build`, and `git diff --check`.
- Commit and push only `staging`; use its exact protected Vercel preview for
  staging lifecycle evidence with the separately authorized QA fixture.
- Production is excluded. Full R11 device management, activation revocation UI,
  app integration, and `sonderLicensing` remain out of scope.
