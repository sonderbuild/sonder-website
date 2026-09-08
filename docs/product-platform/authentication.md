# Customer authentication

## R6 decision

Customer authentication uses WorkOS AuthKit's supported server APIs behind a
custom sonder interface. `/login` stays on the sonder website and uses Magic
Auth's six-digit verified email code. Password and social authentication are
disabled. The minimal website surface is `/login`, sign-out, and `/account`; it
is an authenticated identity diagnostic, not a product portal.

The Next.js server requests and verifies the code with the WorkOS API key and
client ID, then uses the AuthKit SDK's `saveSession` helper to write its sealed
HttpOnly secure session cookie. Access and refresh tokens never enter local
storage, client-side JavaScript state, telemetry, or a URL. The existing
AuthKit proxy continues to verify and refresh that server session before the
website calls the Worker.

The browser requests a short-lived CSRF value from the same origin. Every
Magic Auth mutation requires both that HttpOnly cookie and matching request
header, a matching `Origin`, JSON content, and a small request body. The UI
does not reveal whether an email has an existing customer record. WorkOS
enforces its provider-level abuse controls; an upstream `429` is returned as a
generic retryable result without logging the email or code.

WorkOS currently supports passkey authentication only through its hosted UI,
not its supported custom authentication API. R6 therefore does not offer a
passkey control, enrollment, or hosted-UI fallback. Revisit passkeys only when
WorkOS supports them for the custom flow; do not turn a normal login into an
`authkit.app` redirect to work around that limitation.

## Rejected for the first implementation

- Passwords managed by sonder or enabled in WorkOS.
- Social-only login.
- Hosted AuthKit UI, iframe, or redirect for ordinary website login.
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
