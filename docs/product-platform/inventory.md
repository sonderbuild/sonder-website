# Existing-system inventory

Reviewed 2026-09-07. This is source and configuration inventory, not a claim
that every remote dashboard setting has been verified.

## Website: `sonder-website`

- Next.js 16.3 application, deployed through Vercel.
- Marketing routes exist for sonder, apps, individual products, creative work,
  about, and contact.
- `/account` is a server-rendered authenticated identity diagnostic. It consumes
  only the server-side customer-session relationship contract and has no
  commerce, entitlement, license, activation, or download logic.
- No Vercel configuration, server routes, database client, payment SDK, or
  tracked environment-variable file currently exists in this repository.

## API: `sonder-api`

- Separate private repository: `sonderbuild/sonder-api`.
- Cloudflare Module Worker named `sonder-api`, exposed by code at
  `https://api.sonder.build`.
- Current routes are `/health`, Discogs OAuth/search, TIDAL catalog search, and
  the server-only `POST /webhooks/lemonsqueezy` endpoint.
- Two KV namespaces retain short-lived Discogs OAuth state and completion codes.
- Cloudflare observability and source-map upload are configured.
- Required secret names include Discogs, TIDAL, and
  `LEMON_SQUEEZY_WEBHOOK_SECRET`; no values are tracked. The local-testable
  `PLATFORM_DB` D1 binding and forward-only migrations now exist. R3 maps
  verified Lemon test-mode order events to D1, but there are still no account,
  support, or licensing routes.
- The Worker configuration has a compatibility date and a deployed `staging`
  environment named `sonder-api-staging` at
  `https://sonder-api-staging.sonderbuild.workers.dev`. Its D1 and both
  Discogs OAuth KV bindings are staging-only resources; its Lemon secret is
  configured only in that Worker environment. Lemon Test Mode creation,
  resend, and refund have been verified there without retaining raw webhook
  payloads.

## Remote-state verification

The local Worker is authenticated for development but unattended Wrangler
deployment inspection requires a Cloudflare API token. This architecture pass
did not request, display, or create such a token. Before the first platform
implementation, record the deployed Worker version, routes, custom domains,
environment bindings, and secret names in the production checklist.

## R2 remote prerequisite

The checked-in `PLATFORM_DB` binding deliberately uses the all-zero UUID so
local Miniflare/Vitest can initialize D1 without a remote credential. Before a
deployment that uses the platform database:

1. Create `sonder-platform` in Cloudflare D1.
2. Replace the all-zero `database_id` in `sonder-api/wrangler.jsonc` with the
   returned database ID.
3. Apply `migrations/0001_platform_foundation.sql` and
   `migrations/0002_lemon_commerce_ingestion.sql` locally, then to a separate
   staging D1 database, then production.
4. The R3.1 staging D1 and KV resources are provisioned, the staging D1
   migrations are applied, and the Lemon Test Mode creation/resend/refund
   validation is complete. Production remains a separate, unprovisioned
   follow-up.

## Deliberately unchanged

- Existing Discogs and TIDAL behavior.
- Current Vercel deployment and DNS settings.
- Production Cloudflare bindings, secrets, and databases.
- Any customer-facing account, licensing, checkout, or support workflow.
- Any remote Lemon Test Mode delivery or production deployment.
