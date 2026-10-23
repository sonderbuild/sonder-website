# sonder product platform

This directory owns website product/platform documentation. sonder-system owns
shared cross-repository contracts and decisions; sonder-api owns service behavior.
Use the roadmap for implemented versus historically accepted versus fresh-target
blocked status; the original design scope below is retained as history.

## Current decisions

- Keep the existing split: the public site and implemented account UI stay on
  Vercel; `api.sonder.build` remains the Cloudflare Worker API.
- Start the platform database with Cloudflare D1. Reconsider Neon only when its
  specific Postgres capabilities justify an additional operational vendor.
- The original first-website-release scope excluded accounts. Custom WorkOS Magic
  Auth and account/activation surfaces are now implemented and historically staging
  accepted; fresh-target and production acceptance remain separate. No custom
  password service or expanded account scope follows.
- Lemon Squeezy is authoritative for commerce. sonder owns entitlement,
  activation, support-case, and audit data.
- Current report intake, operational correlation and optional GitHub work after
  triage follow [system reporting authority](../../../sonder-system/SYSTEM.md).
  Earlier automatic mail-to-case/issue flows below are historical design; Resend
  delivery is not an established API integration.

## Documents

| Document | Purpose |
| --- | --- |
| [Inventory](./inventory.md) | What exists today and what this milestone does not change. |
| [Product publishing](./product-publishing.md) | Catalog/Sanity ownership, gaps and product onboarding. |
| [Architecture](./architecture.md) | System boundaries, ownership, and responsibilities. |
| [Environments](./environments.md) | Development, preview, staging, and production boundaries. |
| [Data model](./data-model.md) | D1 records, constraints, retention, and auditability. |
| [Licensing](./licensing.md) | Purchase, entitlement, activation, and offline-verification design. |
| [Authentication](./authentication.md) | Account policy and future sign-in flow. |
| [Support](./support.md) | Support-case triage and GitHub handoff. |
| [Releases](./releases.md) | macOS versioning and Sparkle release discipline. |
| [Telemetry](./telemetry.md) | Sentry and TelemetryDeck data boundaries. |
| [Security](./security.md) | Required controls and incident response. |
| [Roadmap](./roadmap.md) | Bounded implementation milestones and production gates. |
| [Decisions](./decisions/) | Short records of consequential choices. |
| [Runbooks](./runbooks/) | Procedures for incidents and exceptional cases. |

## Original architecture milestone scope — historical

This documentation does not add D1, authentication, account UI, Lemon webhooks,
or licensing endpoints. Current implementation and remaining acceptance are recorded in the roadmap;
do not restart this completed design milestone.
