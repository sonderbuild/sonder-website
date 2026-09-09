# ADR 003: Custom customer authentication with WorkOS AuthKit APIs

**Status:** accepted, implemented, and verified in staging

R6 selects WorkOS AuthKit for customer authentication, while keeping the
normal sign-in experience on the sonder website. The custom `/login` UI asks
WorkOS to send and verify a Magic Auth six-digit verified-email code using the
server-only API key. It then uses WorkOS's maintained Next SDK to save a sealed
secure cookie, refresh the session, and sign out. sonder does not store
passwords, recovery factors, or browser tokens.

The custom API is intentionally preferred over a hosted AuthKit redirect or
iframe. Each mutation is same-origin and protected by a short-lived
double-submit CSRF value. The API secret remains server-side, code failures are
generic, and a response without `email_verified` never creates a website
session. Passwords remain disabled. R6.2 adds Google in staging via
WorkOS's custom Authentication API: the user sees a sonder-owned button,
authorizes with Google, and returns to a sonder callback that exchanges the code
server-side. The user does not visit hosted AuthKit UI. R6.3 enables Apple in
WorkOS staging through the same provider-neutral code path, using WorkOS default
credentials only. Apple consent can therefore show WorkOS branding, but the
normal UI and callback remain on sonder. Production Apple remains disabled until
sonder has paid Apple Developer Program access and supplies its own credentials.

WorkOS currently exposes passkeys only through hosted AuthKit UI. R6 therefore
does not expose passkey sign-in or enrollment in the custom interface and does
not fall back to `authkit.app`. This is a documented product limitation, not a
reason to weaken the final UX boundary. Reassess it only when WorkOS provides a
supported custom passkey API.

The Worker independently verifies each native AuthKit bearer token against
`https://api.workos.com/sso/jwks/<WORKOS_CLIENT_ID>` using RS256. It requires
the exact client-scoped issuer
`https://api.workos.com/user_management/<WORKOS_CLIENT_ID>`, matching
`client_id`, a non-empty subject, and expiry. The first-party token has no
required `aud` claim. The Worker then retrieves the provider user with its
server-only WorkOS API key and accepts an identity only when the returned
subject matches the JWT and `email_verified` is true.

The first verified lookup may link an internal, provider-neutral identity to an
existing Lemon-projected customer using only a centrally normalized email hash.
No matching customer creates no customer, entitlement, license, or activation;
the identity stays unlinked and access fails closed. A linked provider subject
is immutable at the database layer, and a partial unique customer index prevents
a customer from acquiring a second WorkOS subject. A changed email, Apple relay
address, or unexpected second WorkOS subject never silently merges customer
access. Any correction is an explicit future support operation.

The global header is server-rendered from the existing sealed AuthKit session:
it exposes only `Account` or `Sign in`, never customer identity data. A missing
or invalid session fails closed. This adds no portal data or client-trusted
session state.

This decision does not add account product data, native-app authorization,
account claims, or a customer portal.
