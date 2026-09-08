# Customer authentication

## R6 decision

Customer authentication uses WorkOS AuthKit, with passkeys enabled as the
primary method and Magic Auth's verified email code as the fallback. Password
authentication is disabled in the WorkOS application. The minimal website
surface is `/login`, `/callback`, sign-out, and `/account`; it is an
authenticated identity diagnostic, not a product portal.

The Next.js server owns the WorkOS session. The AuthKit SDK manages PKCE,
callback state/nonce validation, sealed HttpOnly secure cookies, token refresh,
and sign-out. Access and refresh tokens never enter local storage, client-side
JavaScript state, telemetry, or a URL.

## Rejected for the first implementation

- Passwords managed by sonder or enabled in WorkOS.
- Social-only login.
- Account creation based solely on possession of a license key.
- Organizations, teams, roles, avatars, or public profiles.

## Linking rule

An authenticated provider subject is not itself a customer. The Worker verifies
the signed WorkOS access token, retrieves the provider user with a Worker-only
API key, and requires the provider's `email_verified` flag. It normalizes the
verified email by trimming it and lowercasing only its domain—no Gmail aliases,
dot removal, plus stripping, or other guessed provider semantics.

The resulting SHA-256 value must identify exactly one existing
Lemon-projected customer. A match creates or completes one `customer_identities`
link. No match records one unlinked identity and returns no customer data. A
linked subject cannot be moved to another customer; a changed verified email
fails closed and is recorded as `identity.link_failed`. The customer ID and
email in a browser request are ignored because neither is accepted by the API.

No account lookup changes purchases, entitlements, licenses, activation state,
or Lemon data. R6 deliberately has no self-service claim/merge process.

## Deferred native-app authorization

The app opens the system browser, uses an authorization-code flow with PKCE,
and receives a one-use code through its registered custom URL callback. The app
exchanges that code with the Worker; it does not receive a browser session or a
long-lived customer credential.
