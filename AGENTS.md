# sonder.build — project handoff

## Product and authority

`sonder.build` is sonder's Vercel-hosted Next.js public studio site and
authenticated account presentation. It owns marketing/UI rendering, the custom
WorkOS Magic Auth interface, the sealed server-side website session, and the
account ownership/licensing and activation approval/management surfaces. It is
not the commerce, entitlement,
licensing, webhook, email-delivery, or platform-data service.

- [Product-platform index](docs/product-platform/README.md) maps the
  authoritative project documents.
- [Architecture](docs/product-platform/architecture.md) owns the website ↔
  `sonder-api` boundary.
- [Authentication](docs/product-platform/authentication.md) owns custom WorkOS
  Magic Auth and account-session policy.
- [Environments](docs/product-platform/environments.md) owns local, preview,
  staging, and production safety boundaries.
- [Roadmap](docs/product-platform/roadmap.md) owns implementation status. It
  records R6–R8 and R11A/B as historically staging-verified. Completed R6.3 and
  R7 plans are archived under docs/exec-plans/completed with link-preserving
  pointers at their former paths; other retained plans record historical work.
  Fresh Greenfield consumer acceptance remains blocked by the accepted API target.
  Production gates require explicit external authority and are never selected
  autonomously from local dirty work.
- Decisions, security guidance, runbooks, and licensing/data-model details are
  indexed from the product-platform README.

## Cross-repository authority

This repository remains authoritative for website implementation, product
documents, roadmap, and validation. Cross-repository sonder platform contracts,
service/repository ownership boundaries, shared lifecycle semantics, and
environment topology live in the `sonder-system` repository when that checkout
is available. Do not copy those system documents here.

Before shared platform infrastructure or dependent deployment work, read the
[canonical execution roadmap](../sonder-system/docs/roadmaps/platform-infrastructure-execution.md)
for accepted boundaries, API/consumer ordering, evidence and the single next
action. Keep website implementation plans here and link shared authority rather
than copying its execution roadmap.

The API's executable implementation remains authoritative for its behavior;
`sonder-system` records only the facts shared across repositories. If website
evidence conflicts with `sonder-system`, reconcile and record the mismatch
explicitly rather than silently choosing one source.

## Website and API boundary

The website owns public pages, account presentation, server-side WorkOS session
handling, and server-to-server consumption of customer session/products/licensing,
activation approval and customer revocation contracts. `sonder-api` owns verified
customer identity resolution, D1, Lemon Squeezy webhooks, commerce projection,
entitlements, licensing, activation, signing keys and provider credentials.
Resend delivery is an API-owned future seam, not an implemented integration.

Vercel never receives Lemon, Worker, GitHub App, D1, Resend, or entitlement
signing secrets. A checkout return, browser-provided customer identity, local
build, fixture, or preview is never commerce, entitlement, staging, or
production evidence.

## Environment and implementation constraints

- Use `pnpm` with the existing Next.js App Router/TypeScript/Tailwind setup.
  Read the installed Next.js documentation before changing framework behavior;
  this Next.js version has breaking changes.
- Local development is `pnpm dev`; Vercel previews are protected marketing/UI
  review only and have no shared production Worker, customer data, or commerce.
- Staging uses separate WorkOS test, Worker, D1 and Lemon Test Mode resources. Production deployment, purchases, email, webhook replay, and
  other irreversible external operations require explicit authorization.
- Passwords, additional social providers, hosted AuthKit fallback, passkey UI,
  new customer portal capabilities, account claims, native OAuth and changes to
  shared licensing semantics are outside the current accepted website scope.
  Existing staging Google/Apple social flows retain their documented boundaries.

## Skills, validation, and shared workflow

Use the relevant local design skill under `.agents/skills/` for UI or motion
work. Read [.development-harness/validation.json](.development-harness/validation.json)
before validation; it separates automated checks from browser, credentialed,
staging, API, provider, and production-only evidence.

Use `.development-harness/managed/` for reusable workflow policy. Reconcile
project truth and current Git state before substantial work; do not create
competing root product, architecture, or roadmap documents.
