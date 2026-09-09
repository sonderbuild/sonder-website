# Security baseline

## Ownership and access

- Use FileVault, a password manager, and passkeys or hardware security keys.
- Require multi-factor authentication on GitHub, Cloudflare, Vercel, Lemon
  Squeezy, Resend, Sentry, TelemetryDeck, Sparkle, and the domain registrar.
- Keep at least two recovery methods offline. Put organization, registrar,
  payment, and hosting ownership under a company-controlled identity.
- Enable registrar lock and renewal protection. Treat DNS changes as production
  changes with a recorded owner.

## Source and deployments

- Keep product repositories private. Protect `main` with required CI, linear
  history, and no force pushes or deletion. Require review when a second
  maintainer exists; do not create ceremonial self-approval gates for solo work.
- Enable GitHub secret scanning, push protection, Dependabot, and `SECURITY.md`.
- Use a narrowly scoped GitHub App for automation. Personal tokens are only for
  short-lived human operations.
- Protect Vercel previews. Keep production website configuration separate from
  Worker production credentials and deployment authority.

## Secrets and requests

- Store Worker secrets in Cloudflare secrets; store website-only secrets in
  Vercel environment settings. Never commit `.env*`, `.dev.vars*`, PEM files,
  tokens, or license keys.
- Separate development, staging, and production secrets, data stores, webhook
  endpoints, and Lemon modes.
- Verify every provider webhook from its unparsed raw body before decoding it.
  Use idempotency constraints and rate limits on all public mutation endpoints.
- Treat browser data, native-app data, email, attachments, and webhooks as
  untrusted input. Validate schema and size before processing.

## Customer sessions and identity links

- Configure the custom R6.3 UI with Magic Auth plus only the explicitly
  allowlisted Google and Apple providers in staging. Apple uses WorkOS default
  credentials there only; do not add sonder Apple credentials, enable Apple in
  production, or enable any other provider without a separate decision. Keep
  passwords disabled.
  WorkOS currently offers passkeys only through hosted UI, so do not add a
  passkey redirect or enrollment control until its custom API supports it. Use
  a WorkOS test environment and a staging-only application until production
  readiness is approved.
- Keep `WORKOS_API_KEY` and `WORKOS_COOKIE_PASSWORD` server-only. The WorkOS
  client ID and compatibility redirect URI are configuration, but remain
  environment-scoped. Generate a unique cookie password of at least 32 random
  characters per environment; use Secure, HttpOnly, `SameSite=Lax` session
  cookies and a short configured session lifetime appropriate for a customer
  account. Magic Auth mutations additionally require a short-lived HttpOnly,
  `SameSite=Strict` CSRF cookie, matching header, and exact same-origin request.
- Never log an email address, one-time code, WorkOS response, access token, or
  refresh token from the custom authentication routes. Treat provider `429` and
  server errors as generic retryable responses.
- Social start is a same-origin CSRF-protected POST. Its opaque state is held
  only in a ten-minute, Secure, HttpOnly, `SameSite=Lax` callback cookie; the
  callback consumes it before the server-side WorkOS authorization-code
  exchange. Reject missing, mismatched, unsupported, or disabled providers.
- The shared header derives its `Account`/`Sign in` choice only from the sealed
  server session after the AuthKit proxy. It holds no browser identity state and
  renders dynamically per request, so an invalid session fails closed and a
  cached header cannot cross users.
- The Worker validates every native AuthKit bearer JWT against
  `https://api.workos.com/sso/jwks/<WORKOS_CLIENT_ID>` using RS256. It requires
  the exact client-scoped issuer
  `https://api.workos.com/user_management/<WORKOS_CLIENT_ID>`, expiry, a
  non-empty subject, and matching `client_id` before reading customer state.
  These first-party tokens have no required `aud` claim. There is no custom
  AuthKit domain in R6. The Worker obtains verified email only from WorkOS's
  authenticated user endpoint, never a browser payload.
- Audit only material identity state changes: `identity.linked`,
  `identity.unlinked`, and `identity.link_failed`. Audit metadata contains a
  provider and sanitized reason only—never an email, access token, provider API
  response, or customer request body.
- Disabled and unlinked identities fail closed. A provider subject may not be
  reassigned automatically between customers, and a customer may not acquire a
  second WorkOS subject. D1 enforces the latter with a partial unique index on
  non-null `customer_id`. Operational correction requires a reviewed support
  procedure outside R6.

## Licensing keys and proofs

- `ENTITLEMENT_SIGNING_PRIVATE_KEY_PKCS8` is an Ed25519 PKCS#8 Worker secret.
  It is never placed in D1, Vercel, a client app, logs, or an issue. Apps embed
  only an approved public verification key and identify it by ticket `kid`.
- Each installation owns a P-256 signing key. Store its SPKI public key and
  SHA-256 fingerprint only; never collect hardware fingerprints or the private
  key. Secure Enclave is preferred when available, with Keychain fallback.
- Refresh and deactivation require a single-use, activation-bound nonce plus a
  P-256 signature over the protocol version, `POST`, exact route, activation
  and challenge IDs, nonce, issue time, and SHA-256 digest of the unsigned
  request fields. A valid proof is consumed before the privileged action; it
  cannot be replayed.
- Licensing routes apply a 12-request-per-minute D1 limit per route and salted
  requester hash. Rejection happens before activation mutation.
- D1 triggers enforce activation capacity for every transition to `active`,
  including direct inserts and reactivation updates. This is the authoritative
  constraint; application-side counts only improve the ordinary rejection path.
- Rotate signing keys by publishing a new public key and `kid`, retaining the
  previous public verifier for the documented ticket-lifetime overlap. On a
  suspected private-key compromise, retire that `kid`, revoke/reconcile access
  as required, issue a new key, and force clients to refresh online.

## Customer data and incidents

- Minimize identity, purchase, device, and support data. Do not send it to
  TelemetryDeck or copy it into GitHub issues.
- Define retention, deletion, and export handling before accepting payments.
- Export and restore-test D1 before customer data exists.
- On suspected exposure: revoke the relevant secret or session, preserve minimal
  evidence, determine the affected window, rotate related credentials, replay
  safe work, notify where required, and record the corrective action.
