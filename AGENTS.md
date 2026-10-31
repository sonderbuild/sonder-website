# sonder website — implementation handoff

This repository owns website rendering, product catalog/CMS consumers, custom WorkOS authentication, sealed server-side website sessions and account/activation/checkout presentation. sonder-api owns verified customer linkage, commerce, entitlements, licensing, provider credentials and state. Cross-repository contracts are owned by sonder-system; preserve their accepted boundaries.

Read [current implementation and publication boundaries](docs/product-platform/publication.md) and [.development-harness/validation.json](.development-harness/validation.json) before changes. Existing detailed product-platform documents retain historical context; source and current shared contracts determine supported behavior and admission. Never infer payment from a checkout redirect or allow the browser to choose a customer identity.

Use pnpm and the existing lockfile. Before changing Next.js behavior, read installed documentation in node_modules/next/dist/docs. Preserve UI, CMS semantics, session policy, authorization checks, unknown-outcome recovery and closed provider/hosting gates. Do not select new providers or expand account features from this publication task.

Use the managed development-harness policies and relevant installed skills. Validate in proportion to risk. Local builds, synthetic fixtures and skipped CI jobs do not prove provider, installed-app, staging or production acceptance. Never publish private operational material, credentials or environment files. No push before both disclosure and deployment-isolation gates are verified; provider mutations and deployment require explicit separate authority. Preserve unrelated worktrees and branches.
