# sonder website

Next.js website with a local product catalog, optional published Sanity marketing content, custom WorkOS authentication and server-side customer account/activation/checkout presentation. The API owns identity linkage, commerce, entitlements, licensing and durable state; a browser redirect never proves payment.

See [current implementation and publication boundaries](docs/product-platform/publication.md). Earlier product-platform documents are retained historical context; they do not establish current provider, hosting or production acceptance. Cross-repository contracts remain owned by sonder-system and service implementation by sonder-api.

## Local development and validation

Use the locked pnpm version and dependencies. Configure a dedicated local test environment; never copy production or staging credentials into a development checkout. `pnpm dev` starts development, `pnpm lint` and `pnpm test` run local checks, and `pnpm build` generates the production artifact and Next route types before a separate `pnpm exec tsc --noEmit` check.

[Registered validation](.development-harness/validation.json) distinguishes local checks from manual provider and production evidence. The CI backend job remains conditional on separate zero-cost qualification.

## Git deployment boundary

`vercel.json` sets `git.deploymentEnabled` to `false` for all branches. This repository setting does not prove that every connected project honors the configuration. Before any push, verify all connected projects, their roots/configuration, Git triggers and existing deployment state using authorized read access. Provider settings, deployments, purchases and release enablement require separate authorization. Preserve the existing public deployment.
