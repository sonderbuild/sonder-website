# sonder product platform

This directory is the source of truth for systems shared by sonder products. It
records decisions before code is written, so products can reuse the platform
without turning sonder into a general-purpose SaaS operation.

## Current decisions

- Keep the existing split: the public site and future account UI stay on
  Vercel; `api.sonder.build` remains the Cloudflare Worker API.
- Start the platform database with Cloudflare D1. Reconsider Neon only when its
  specific Postgres capabilities justify an additional operational vendor.
- Do not ship a customer account with the first website release. When the first
  paid product needs it, use managed authentication rather than a custom
  password or session system.
- Lemon Squeezy is authoritative for commerce. sonder owns entitlement,
  activation, support-case, and audit data.
- Support mail always becomes a private support case. Only actionable bugs and
  feature requests become GitHub issues.

## Documents

| Document | Purpose |
| --- | --- |
| [Inventory](./inventory.md) | What exists today and what this milestone does not change. |
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

## Architecture milestone scope

This documentation does not add D1, authentication, account UI, Lemon webhooks,
or licensing endpoints. Select the next implementation milestone only after this
design is reviewed.
