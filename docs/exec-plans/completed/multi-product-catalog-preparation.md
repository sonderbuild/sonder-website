# Multi-product catalog preparation

Date: 2026-10-23. Status: COMPLETE for local structural preparation. Local structural preparation only.

## Reconciliation and scope

R14 already implements published marketing normalization and source fallback.
Only Monitor's public route opts into it. Frame/Crate are source-owned; Cue has
no route. Canonical IDs are system-owned, repeated locally in normalizer and
Studio. Product slugs currently double as IDs; account display-name validation
is an independent contract, so the Mactric naming proposal cannot be applied here.
Existing website account dirty work is outside scope and must not be staged.

## Changes

- One website identity projection shared by CMS normalizer and Studio.
- Product records carry separate canonical `id`, route `slug`, and explicit
  `marketingSource`; only Monitor remains CMS-backed.
- Route and metadata select the same catalog policy and query canonical identity.
- Multi-product synthetic tests cover normalization/isolation, fallback, route
  generation, unknown/Cue/proposed-name 404s, and source-owned siblings without CMS.
- Product publishing design documents actual capabilities, gaps and larger-migration
  boundaries; company governance remains in sonder-docs.

## Verification and completion

Run `pnpm test`, `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm build`, local
Markdown link/whitespace checks and final diff review. Build must avoid live
providers and real credentials. Actual Sanity/editor/staging/browser release
acceptance is not asserted. No seeds, data, commerce, auth, deployment or native
identity changes. Validation results and any build limitation will be recorded here.

## Results

- `pnpm test`: 14 files, 209 tests passed on the current combined checkout.
- `pnpm lint` and `pnpm exec tsc --noEmit`: passed.
- An isolated copy under `/private/tmp/sonder-catalog-build-20261023` excluded
  `.env` files and used synthetic local WorkOS config, with no CMS/API origin.
  `pnpm build --webpack` first stopped before compilation because pnpm wanted to
  recheck/install shared dependencies. No reinstall was accepted. Invoking the
  installed CLI directly (`node <checkout>/node_modules/next/dist/bin/next build
  --webpack`) passed compilation, TypeScript, all 13 generated pages and traces.
  This proves the supported webpack production build, not default Turbopack.
- Isolated production HTTP smoke: `/apps`, `/apps/monitor`, `/apps/frame`,
  `/apps/crate` = 200 with expected source copy; `/apps/cue`, `/apps/mactric`,
  `/apps/pulse` = 404; `/products/monitor` = 308 to `/apps/monitor`; `/account`
  = 307 to login. First sandbox loopback attempt was denied; bounded execution
  permission enabled the successful retry. The temporary server was stopped.
- Markdown link/fragment checks, `git diff --check`, identity/source inspection
  and self-review passed. No Monitor seed/document changes or provider access.
- Manual browser visual checks, live Sanity published/draft proof, credentialed
  auth, staging and production remain UNRUN. The existing R14 record remains
  historical evidence; this preparation does not renew it.
- Concurrent account recovery work is excluded from the catalog commit. This
  work changes no auth/account/commerce code or accepted environment gate.
