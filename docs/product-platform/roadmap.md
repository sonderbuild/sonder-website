# Implementation roadmap

Each phase is a separate bounded milestone. Do not begin a later phase merely
because a previous one compiled.

## R1 — Architecture

Complete this documentation, verify the remote-inventory checklist, and review
the decisions. No production platform code.

## R2 — Platform foundations

**Historical foundation implemented; fresh-target acceptance blocked.** The core
D1 model, audit/idempotency and typed persistence boundary exist, with later
historical staging acceptance recorded in R3 onward. The original provisioning
follow-up is not a request to recreate those resources. Current Greenfield API
schema/genesis and consumer retargeting are unaccepted; follow the fresh-target
handoff below and system M1–M6 gates. No new customer or production acceptance is
inferred from existing code or historical resources.

## R3 — Lemon test-mode commerce ingestion

**Complete in staging.** The separate staging D1/KV resources, Lemon secret,
and both forward-only migrations are in place. Signed Lemon Test Mode
`order_created`, resend idempotency, and `order_refunded` were verified through
the receipt, product/variant/customer/purchase projection, audit, and outbox
seams. No entitlement transitions or subscription lifecycle handling were
added; production remains out of scope until its independent readiness gates
are approved.

## R4 — Entitlement reconciliation

**Complete in staging.** Commerce outbox jobs reconcile to derived D1
entitlements using current projected state, a fail-closed per-variant eligibility
policy, transactional transition/audit/job completion, and retryable failures.
The staged Test Mode refund produced one revoked entitlement and one revoke
audit event. This milestone adds no account authentication, portal, activation
API, device registration, or certificate signing.

Account authentication, the minimal account UI, account claim review, native
app PKCE authorization, activation allocation, certificate issuance,
deactivation, and key rotation remain a later bounded milestone.

## R5 — Licensing and activation API foundation

**Complete in staging.** Server-side opaque license issuance, P-256
installation proof, Ed25519 entitlement tickets, activation/replay protection,
and an independently verified staging ticket are in place. Account UI and
customer authentication remain out of scope.

## R5.1 — Atomic activation capacity

**Complete in staging.** A forward D1 trigger migration enforces the active
installation allowance at the database write boundary. Concurrent final-slot
activation was verified in staging without changing the licensing protocol or
public response contracts.

## R6 — Customer identity and authentication

**R6, R6.2, and R6.3 staging verified.** WorkOS Magic Auth runs behind a custom `/login` UI on
the sonder domain, creates a server-managed sealed session, and preserves the
Worker-side verified session boundary. The Worker requires native AuthKit's
client-scoped issuer and JWKS for the configured client, RS256, expiry, subject,
and `client_id`, without an `aud` requirement. Passwords remain disabled. R6.2
adds Google-only social sign-in in staging via the WorkOS custom Authentication
API. R6.3 enables WorkOS default Apple credentials in staging only through the
same provider-neutral path; provider consent may show WorkOS branding.
Production Apple remains deferred pending Apple Developer Program access and
sonder-owned Apple credentials. The server-rendered global header reads the
sealed session and shows only `Account` or `Sign in`, failing closed for absent
or invalid sessions without client identity state.
Passkey UI is deferred because WorkOS currently supports
passkeys only through hosted AuthKit, which R6 intentionally does not use. A
forward migration adds provider-neutral identity links and makes an existing
link immutable. Linking is limited to one verified WorkOS identity and one
unambiguous Lemon-projected customer; unlinked, changed-email, disabled,
invalid, and unverified cases fail closed. R6 adds no portal data, customer
self-service, native-app OAuth, or licensing changes. Staging verified both
the unknown-customer `identity.unlinked` path and the unambiguous
Lemon-projected-customer `identity.linked` path; a repeat login produced no
duplicate identity or material audit event. R6.2 adds a D1-enforced inverse
identity constraint: one customer may have only one linked WorkOS subject.
Google staging sign-in returned to `/account`, its same-subject path remained
idempotent, and Magic Auth plus sign-out still worked. Sanitized staging
aggregates showed no authentication-created entitlement, license, or activation
state. Final Apple inspection recorded only privacy-safe global inventory
counts, which are not a causal before/after commercial-state record; the
authentication path has no commercial mutation.

## R7 — Read-only customer account

**Staging acceptance complete; production untouched.** The account page
consumes only the shared customer-session relationship contract through a
server-side, no-store request. It presents linked, unlinked, disabled,
email-not-verified, unauthenticated, and unavailable states without exposing
identity/customer IDs, customer email, provider data, or commercial state. No
entitlement, license, activation, device, purchase, billing, download, or
profile feature is part of R7. The accepted target is the Ready Git Preview for
staging commit `6225ef41bd461fcd26919967e76069de3fa5b9a6`, which is also the
`staging.sonder.build` domain target. Linked Magic Auth and unlinked Google QA
sessions rendered their distinct states; the header transitioned correctly
through sign-out and signed-out `/account` redirected to `/login`.
`accountDisabled` and `emailNotVerified` are covered deterministically without
unsafe WorkOS state fabrication. Read-only staging aggregates showed no
purchase, entitlement, license, or activation mutation. R8 remains out of
scope.

## R8 — Read-only product ownership projection

**Staging acceptance complete; production untouched.**
`sonder-system` establishes the provider-neutral `monitor`, `frame`, and `crate`
catalog and the separate customer-products contract. The account page consumes
that contract only after the existing session request confirms a linked
customer, through a server-side no-store request. It renders only active
effective ownership and preserves R7's unauthenticated, unlinked, disabled,
verification-required, unavailable, header, and logout behavior. It does not
render provider identifiers, purchases, historical/revoked ownership, licenses,
activation/device data, downloads, billing, or controls.

Staging has one explicit QA-only Lemon Test Mode variant mapping to canonical
`monitor`; it is not production catalog configuration, and Frame and Crate remain
unmapped. The accepted website target is Ready Preview
`BRQ3Yo9tL2qPTGYb6CYEWsXj8yjq` at staging commit
`d64e4288524971628f2128f67cdb15c00298d0b7`, also assigned to
`staging.sonder.build`. The linked QA Magic Auth session rendered exactly one
`Monitor — Active` entry. The before/after staging D1 aggregates were identical:
2 purchases, 4 entitlements, 2 licenses, and 6 device activations; the
post-read query recorded zero writes. Production remains untouched.

## R11A — Browser activation approval surface

**Staging verified.** The website owns the
minimal authenticated approval/deny presentation for R10's opaque activation
request URL. It uses the existing sealed WorkOS session only in server-side
calls to the Worker, preserves the exact opaque request through custom Magic
Auth and enabled social sign-in, and requires same-origin CSRF protection plus
an explicit customer decision. The surface shows only provider-neutral request
preview fields and reports approval as approval—not activation—until the app
completes the separate installation-key proof. It has no device-management or
activation-revocation UI. The deployed R10 preview does not include expiry or
state fields, so the website does not invent them. The exact protected staging
Git Preview verified sign-in return, terminal rendering, approval without a
ticket, P-256 completion and consumption, wrong-key and replay rejection,
denial, expiry, and the capacity presentation. The compact ticket shape was
observed and R10.2 later independently verified a fresh ticket with the
staging-only public `staging-ed25519-v2` trust artifact. The isolated QA fixture
was revoked and removed; production is untouched.

## R11B — Customer activation management

**Staging verified, with scoped multi-identity evidence noted.** The account surface consumes the established
customer-licensing read contract after its existing server-side session check.
It presents activation slots and active device presentation metadata only. An
explicit confirmation uses the existing short-lived same-origin CSRF relay to
revoke an opaque activation, then refreshes from the Worker. The Worker owns
authorization, D1 revocation/audit, capacity release, and later refresh
rejection. It exposes no keys, fingerprints, credentials, provider IDs,
purchase history, downloads, or anonymous app-side deactivation. Staging
acceptance proved live usage, device metadata, explicit revoke, immediate count
refresh, and post-revoke installation-key refresh rejection. The QA fixture was
restored. Repeat and cross-customer paths are deterministic API evidence because
the staging browser session has one linked QA identity; no second identity was
fabricated. Production is untouched.

## Internal Admin and fresh-target handoff

sonder Admin is implemented in the separate `sonder-admin` repository, with
historically accepted reads, contracted revoke/retry and R16 triage. The former
IDEA description here was obsolete; shared Decisions 0006–0009/0015 and the owner
repository define current scope. This website does not own that backlog.

**BLOCKED by fresh API acceptance:** reconfigure and verify existing session,
products/licensing, browser approval and customer revocation against the accepted
Greenfield staging lineage. Follow system M2/M4–M6 dependencies and the bounded
0019 exception; do not rewrite working UI or call historical staging new-lineage
acceptance. Owner acceptance: exact origin/client and cookie isolation, no-store
server-only API calls, error/denial compatibility, CSRF revoke, approval without
ticket issuance, and full native completion. Use owner registered tests plus
separately authorized synthetic staging browser/API evidence. No production rollout.
[Guided setup](../../../sonder-api/docs/setup/README.md) supplies configuration
navigation; the [system roadmap](../../../sonder-system/docs/roadmaps/platform-infrastructure-execution.md)
owns shared sequencing and exact external prerequisites.

## Production gates

Before a paid product launch, complete every applicable runbook, validate D1
restore, confirm provider webhooks in staging and production, verify privacy and
terms, rotate a non-production signing key, and run a real lost-device scenario.
