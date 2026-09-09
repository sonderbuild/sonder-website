# R6.3 — Auth surface completion

**Status:** in progress

## Reconciled goal

Complete the authenticated website surface without introducing account ownership,
commerce, entitlement, license, or activation APIs. Keep WorkOS as the sole
authentication authority and the existing sealed session as the only source of
header state.

## Scope and invariants

- The global header must render `Sign in` for an absent, expired, invalid, or
  otherwise unavailable server session, and `Account` only for an existing
  WorkOS user plus access token.
- It must read the server session at request time, hold no client identity
  state, expose no user data, and never cache one user's state for another.
- Magic Auth and Google remain production-capable implementation paths, subject
  to later production authorization. Passwords remain disabled.
- Apple uses the existing provider-neutral `AppleOAuth` seam only. WorkOS
  default Apple credentials are eligible for staging testing only; production
  remains disabled until Sonder owns the Apple Developer credentials.
- Website changes stay on `staging`; Worker, D1 schema, commerce, licensing,
  activation, and R7 stay out of scope.

## Integration surface

1. `src/components/layout/header.tsx` reads the established AuthKit session.
2. `src/app/layout.tsx` continues to render the same shared header for every
   route.
3. Existing social start/callback routes continue to enforce the server-side
   provider allowlist and OAuth state cookie.
4. WorkOS staging must enable its default Apple provider before Vercel staging
   may add `apple` to `WORKOS_SOCIAL_PROVIDERS`.

## Verification

1. Unit-test signed-out, signed-in, and failed-session header output.
2. Run website tests, lint, TypeScript, webpack production build, and
   `git diff --check`.
3. In staging, verify header state before and after sign-in and sign-out, Magic
   Auth, Google, and Apple when the WorkOS staging provider is enabled.
4. Inspect only sanitized staging identity/audit and aggregate commercial
   counts; do not create production state or expose credentials, tokens, or
   email addresses.

## Open external action

At implementation completion, enable Sign in with Apple in the **WorkOS
staging** dashboard using WorkOS default credentials, then add `apple` to the
staging-only Vercel provider allowlist. This does not authorize production
configuration or Sonder-owned Apple credentials.
