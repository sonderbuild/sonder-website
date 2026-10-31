# Current website implementation and publication boundary

## Implemented source

- Public studio, product catalog and app routes, local product fallback and optional validated Sanity marketing projection. CMS copy does not control canonical product identity or purchase authority.
- Custom WorkOS Magic Auth and existing session proxy, CSRF and server-origin protections, bounded requests, typed authentication/provider failures and signed-out/unlinked/unavailable presentation.
- Server-side customer session, licensing and activation approval/management consumers. The browser receives only projected UI data, never provider credentials or an authoritative entitlement decision.
- Closed checkout coordination and read-only recovery/status for uncertain outcomes. An ambiguous POST is not repeated automatically; a return URL is not evidence of payment. Commerce and licensing remain API-owned.
- Explicit marketing-only availability mode; production legal routes remain unavailable until approved publication data/text exists. Development drafts are not release approval.
- Security headers and local Cloudflare application/request-boundary tooling. Shipped runtime modules retain their accepted guards; they are not a hosting cutover or provider admission.

## Evidence and limits

Registered local lint/test/build/type checks qualify only the source under test. Real WorkOS/Lemon integration, controller/privacy approval, native licensing, recovery, protected hosting/capacity and legal publication requirements retain their separate acceptance gates. No credentials, private provider correspondence, operational receipts, screenshots or resource-specific campaign instructions belong in the public source snapshot.

Repository configuration disables Git deployments for all branches with `git.deploymentEnabled: false`. [Vercel documents this setting](https://vercel.com/docs/project-configuration/git-configuration). It does not establish project inventory, effective root/config precedence, account permissions or current provider enforcement. Those must be verified independently before a push; no remote mutation or deployment follows from a local commit.

## Retained documentation

The other product-platform documents predate this publication snapshot and include historical or planned integrations. They remain historical context, not instructions to operate providers or evidence that the latest product was deployed. This summary records only current website implementation and its publication boundaries; it does not replace sonder-system contracts or API ownership.
