# Customer authentication

## R6 decision

Customer authentication uses WorkOS AuthKit's supported server APIs behind a
custom sonder interface. `/login` stays on the sonder website and offers Magic
Auth's six-digit verified email code plus enabled WorkOS social providers. R6.2
enables Google in the separate staging environment. Passwords and every other
social provider remain disabled. The minimal website surface is `/login`,
sign-out, and `/account`; it is an authenticated identity diagnostic, not a
product portal.

The Next.js server requests and verifies the code with the WorkOS API key and
client ID, then uses the AuthKit SDK's `saveSession` helper to write its sealed
HttpOnly secure session cookie. Access and refresh tokens never enter local
storage, client-side JavaScript state, telemetry, or a URL. The existing
AuthKit proxy continues to verify and refresh that server session before the
website calls the Worker.

The browser requests a short-lived CSRF value from the same origin. Every
Magic Auth mutation and social-provider start requires both that HttpOnly cookie
and matching request header, a matching `Origin`, JSON content, and a small
request body. Social start creates an opaque one-use state value in a separate
HttpOnly, Secure, `SameSite=Lax` callback cookie; the provider callback must
return that exact state before the server exchanges its authorization code. The
UI does not reveal whether an email has an existing customer record. WorkOS
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
the signed native AuthKit access token with RS256 against
`https://api.workos.com/sso/jwks/<WORKOS_CLIENT_ID>` and requires the exact
client-scoped issuer `https://api.workos.com/user_management/<WORKOS_CLIENT_ID>`,
matching `client_id`, a non-empty subject, and expiry. It intentionally does
not require `aud`, which is absent from this first-party session-token type.
It then retrieves the provider user with a Worker-only API key and requires the
provider's `email_verified` flag. It normalizes the verified email by trimming
it and lowercasing only its domain—no Gmail aliases, dot removal, plus
stripping, or other guessed provider semantics.

The resulting SHA-256 value must identify exactly one existing
Lemon-projected customer. A match creates or completes one `customer_identities`
link only when that customer has no assigned WorkOS subject. D1 enforces both
directions: one WorkOS subject cannot move between customers and one customer
cannot acquire a second subject. No match, an Apple private relay address, or a
second subject for an already-linked customer records an unlinked identity and
returns no customer data. A changed verified email fails closed and is recorded
as `identity.link_failed`. The customer ID and email in a browser request are
ignored because neither is accepted by the API.

WorkOS owns the association of Magic Auth and social credentials to its user
subject. If Magic Auth and Google return the same WorkOS subject, the existing
Sonder link is idempotent. If WorkOS returns a different subject for the same
visible email, sonder does not merge accounts: the second subject remains
unlinked pending a future reviewed support procedure.

## Social providers

The provider-neutral start and callback flow supports `google` and `apple`,
mapping only server-side to WorkOS `GoogleOAuth` and `AppleOAuth`. An explicit,
environment-scoped `WORKOS_SOCIAL_PROVIDERS` allowlist controls both the visible
buttons and callable start/callback paths. Staging enables only `google`; Apple
is implemented as an inactive seam and is neither displayed nor invokable until
its credentials and WorkOS provider are explicitly configured.

Google redirects through the provider and WorkOS OAuth endpoint, then returns
to the registered Sonder callback. It never displays generic hosted AuthKit UI.
The callback exchanges the code server-side and writes the existing sealed
session; provider authorization codes and tokens never enter browser storage,
telemetry, or logs.

Apple is deferred until paid Apple Developer Program membership is available.
Its future setup requires a primary App ID with Sign in with Apple, a linked
Services ID, the WorkOS-provided Return URL with `api.workos.com` registered as
the Apple domain, WorkOS Team ID, Key ID, and an Apple `.p8` key entered only in
the WorkOS environment. The WorkOS-provided outbound domains must also be
registered for Apple Private Email Relay. The `.p8` key must never enter Vercel,
Cloudflare, source control, or client code. A private relay address does not
match a Lemon email by assumption and therefore remains safely unlinked unless
a future reviewed support process resolves it.

No account lookup changes purchases, entitlements, licenses, activation state,
or Lemon data. R6 deliberately has no self-service claim/merge process.

## Staging verification

On 2026-09-09, a verified QA identity without a matching Lemon-projected
customer persisted one `unlinked` identity and one `identity.unlinked` audit
event, then failed closed. After a signed Lemon Test Mode `order_created` for
the same verified email created exactly one matching customer, the next
authenticated lookup transitioned that same identity to `linked` and appended
one `identity.linked` audit event. A repeat login created neither an identity
row nor another material identity audit event. The Lemon order legitimately
created its purchase and derived entitlement; authentication itself created no
entitlement, license, or device-activation state.

## Deferred native-app authorization

The app opens the system browser, uses an authorization-code flow with PKCE,
and receives a one-use code through its registered custom URL callback. The app
exchanges that code with the Worker; it does not receive a browser session or a
long-lived customer credential.
