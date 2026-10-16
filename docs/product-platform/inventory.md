# Existing-system inventory

Source reconciliation: 2026-10-16. This is implementation evidence; current remote
state and production readiness are unverified. Historical dated inventory remains
in Git; its old instructions to create a platform database/apply only two migrations
are superseded for Greenfield by accepted system Decisions 0018/0019.

- Website owns public marketing, custom WorkOS Magic Auth/social flows, sealed
  server sessions, account ownership/licensing, browser activation approval and
  customer activation revocation. See account page, auth routes and customer
  licensing/activation clients under `src/` and the owner roadmap.
- API owns verified identity/customer linkage, Lemon order/refund projection,
  entitlement/license/device state, ticket signing, Admin authorization/audit,
  reporting/triage lifecycle and provider adapters. Its router registers these
  paths; old “no account/licensing routes” text was obsolete.
- API default deployment still uses the historical E-oriented path with unset
  target configuration. Dedicated two-account native-D1 Operating and independent
  Backup sources exist but are not accepted Greenfield staging/production.
- Vercel receives only website server/session and public marketing configuration;
  browser never selects a customer or receives Worker/provider/signing secrets.
- Sanity published marketing reads are anonymous/tokenless; draft preview is deferred.
- Admin is a separate implemented application, not a future website feature.
- Resend delivery and GitHub release integration are not implemented API routes;
  documentation/account existence must not be treated as support.

See [shared platform assessment](../../../sonder-system/docs/reviews/platform-audit-2026-10-16.md)
for subsystem evidence and gaps, [guided setup/inventory](../../../sonder-api/docs/setup/README.md)
for current names/owner locations, and [canonical sequencing](../../../sonder-system/docs/roadmaps/platform-infrastructure-execution.md)
for dependencies. No provider, migration, deployment or secret operation follows
from this inventory. Existing historical acceptance is preserved; new-lineage
consumer validation and production acceptance remain separate.
