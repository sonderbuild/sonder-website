# Implementation roadmap

Each phase is a separate bounded milestone. Do not begin a later phase merely
because a previous one compiled.

## R1 — Architecture

Complete this documentation, verify the remote-inventory checklist, and review
the decisions. No production platform code.

## R2 — Platform foundations

**In progress.** D1 migrations, the core data model, audit events,
webhook-receipt idempotency, local test setup, and the typed persistence
boundary are implemented. The required remote follow-up is to provision
separate staging/production D1 and KV resources, configure named Worker
environments with those IDs, and apply the forward-only migration. No customer
account has been added.

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

**Implemented locally; staging verification pending credentials.** WorkOS
AuthKit is configured in source as passkey-first with Magic Auth fallback,
server-managed website sessions, a minimal login/callback/sign-out/account
surface, and a Worker-side verified session boundary. A forward migration adds
provider-neutral identity links and makes an existing link immutable. Linking is
limited to one verified WorkOS identity and one unambiguous Lemon-projected
customer; unlinked, changed-email, disabled, invalid, and unverified cases fail
closed. R6 adds no portal data, customer self-service, native-app OAuth, or
licensing changes.

## Production gates

Before a paid product launch, complete every applicable runbook, validate D1
restore, confirm provider webhooks in staging and production, verify privacy and
terms, rotate a non-production signing key, and run a real lost-device scenario.
