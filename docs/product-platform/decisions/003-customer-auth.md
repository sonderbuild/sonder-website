# ADR 003: Managed customer authentication with WorkOS AuthKit

**Status:** accepted and implemented in R6, pending staging verification

R6 selects WorkOS AuthKit for customer authentication. Its hosted UI is
configured passkey-first with Magic Auth (verified email code) as the fallback;
password authentication is disabled. The website uses WorkOS's maintained Next
SDK for PKCE, callback state/nonce handling, sealed secure cookies, session
refresh, and sign-out. sonder does not store passwords, recovery factors, or
browser tokens.

The Worker independently verifies each bearer access token against WorkOS's
JWKS using RS256, the configured issuer, expiry, and WorkOS client ID. WorkOS
uses `client_id` rather than a standard `aud` claim in its documented token, so
that claim is the configured audience check. The Worker then retrieves the
provider user with its server-only WorkOS API key and accepts an identity only
when the returned subject matches the JWT and `email_verified` is true.

The first verified lookup may link an internal, provider-neutral identity to an
existing Lemon-projected customer using only a centrally normalized email hash.
No matching customer creates no customer, entitlement, license, or activation;
the identity stays unlinked and access fails closed. A linked provider subject
is immutable at the database layer, so a changed email never silently moves it
to another customer. Any correction is an explicit future support operation.

This decision does not add account product data, native-app authorization,
account claims, or a customer portal.
