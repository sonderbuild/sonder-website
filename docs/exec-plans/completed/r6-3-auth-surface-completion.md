# R6.3 — Auth surface completion

**Status:** complete in staging

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
  remains disabled until sonder owns the Apple Developer credentials.
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

## Completed external configuration and evidence

WorkOS staging enabled its default Apple credentials and Vercel staging set the
existing provider allowlist to `google,apple`; no sonder Apple secret was
created. Apple completed through the existing callback to `/account`, with the
expected WorkOS consent branding. A sealed session rendered `Account` in the
global header and sign-out rendered `Sign in`. Privacy-safe D1 aggregate
inspection confirmed the current staging inventory only; because no global
before-snapshot was captured, it does not attribute commercial rows to Apple.
The website authentication path has no commercial mutation. Production remained
untouched.
