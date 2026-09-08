# sonder.build — project handoff

## Product and authority

`sonder.build` is sonder's Vercel-hosted Next.js public studio site and
authenticated account presentation. It owns marketing/UI rendering, the custom
WorkOS Magic Auth interface, the sealed server-side website session, and the
minimal account diagnostic surface. It is not the commerce, entitlement,
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
  records R6 as staging-verified; there is no committed active execution plan.
  Production gates require explicit external authority and are never selected
  autonomously from local dirty work.
- Decisions, security guidance, runbooks, and licensing/data-model details are
  indexed from the product-platform README.

## Website and API boundary

The website owns public pages, account presentation, server-side WorkOS session
handling, and its server-to-server call to the documented
`GET /v1/customer/session` endpoint. `sonder-api` owns verified customer
identity resolution, D1, Lemon Squeezy and Resend webhooks, commerce
projection, entitlements, licensing, activation, signing keys, provider
credentials, and operational email handling.

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
- Staging uses separate WorkOS test, Worker, D1, Lemon Test Mode, and Resend
  test resources. Production deployment, purchases, email, webhook replay, and
  other irreversible external operations require explicit authorization.
- Password, social login, hosted AuthKit fallback, passkey UI, customer portal
  data, account claims, native OAuth, and licensing changes are outside the
  current R6 website boundary.

## Skills, validation, and shared workflow

Use the relevant local design skill under `.agents/skills/` for UI or motion
work. Read [.development-harness/validation.json](.development-harness/validation.json)
before validation; it separates automated checks from browser, credentialed,
staging, API, provider, and production-only evidence.

Use `.development-harness/managed/` for reusable workflow policy. Reconcile
project truth and current Git state before substantial work; do not create
competing root product, architecture, or roadmap documents.
