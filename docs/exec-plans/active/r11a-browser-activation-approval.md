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

## Staging evidence — 2026-09-10

- Commit `de7b17a` was pushed only to `staging`. Vercel deployed
  `dpl_EjNtR3o1QUVoXcJ4kHDB6fLhwtsz` at
  `https://sonder-website-eonrm9wqs-sonder17.vercel.app`, with the protected
  `staging.sonder.build` alias targeting that staging preview.
- The signed-out path redirected to the custom login surface with the exact
  opaque `/account/activate/{requestId}` return path. An expired request then
  rendered the fail-closed terminal presentation; no request details or ticket
  were exposed.
- With the existing linked staging WorkOS session, the authenticated customer
  approved a fresh request. The API returned only `state: approved`; no ticket
  was issued until the installation completed its P-256 proof. Successful proof
  consumed the request and created exactly one activation. A repeated completion
  was rejected, and a proof from a different key was rejected before the valid
  installation key could complete its own request.
- The capacity presentation showed `3 of 3 used` and the API kept the request
  pending after rejecting allocation. A separate request was denied through the
  same authenticated surface and polled as `denied`. A distinct staging-only
  request whose expiry was forced in D1 polled as `expired`.
- The returned ticket had the expected three compact segments. Independent
  cryptographic verification was not repeated in this run: the non-secret
  `staging-ed25519-v1` public verifier is deliberately retained outside these
  repositories and was not available to this session. No private key or raw
  license credential was requested or accessed.
- Cleanup revoked the isolated `sonder_qa_fixture` through the staging
  revocation path, detached its entitlement, deactivated all three synthetic
  activations, and deleted the named test requests. Final staging counts were
  zero active fixture activations, zero linked fixture entitlements, zero test
  requests, and one disabled fixture license. Production was not queried,
  migrated, deployed, or changed.
