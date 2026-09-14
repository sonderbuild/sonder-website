# Local Sanity workspace

This directory contains only the local Studio schema. The root
`sanity.config.ts` reads its public project and dataset configuration; neither
file identifies an editor, token, secret, or custom Studio host.

After an authorized project and dataset exist, run `pnpm sanity:dev` with
`SANITY_PROJECT_ID`, `SANITY_DATASET`, and `SANITY_API_VERSION` set in ignored
local environment configuration. The Studio configuration refuses to start
without the project and dataset values. These values configure only normal,
anonymous published-content reads; the website sends no Sanity API token.

`productId` is a closed canonical catalog reference, not a route or document
identifier. Sanity's field validation cannot guarantee one document globally
per product. The website published-content query therefore treats zero or more
than one matching document as unavailable and falls back to source content.

## Authorized public provider state

- Project: `sonder-marketing` (`wbzwvwu5`)
- Dataset: `staging` (public)

This configuration is intentionally Free-compatible: normal runtime requires
only the public project ID, dataset name, and API version. It requires no
private dataset support, custom role, write-capable token, or Growth-only
feature. The current automatic Growth Trial is not relied upon, and no payment
details were added. Only intentionally public marketing/editorial content may
enter this dataset; production remains unconfigured and unexercised.

## Deferred preview design — not implemented

The website may later add a server-only `POST /api/cms/preview` route that
verifies an environment-scoped preview secret, enables Next.js Draft Mode, and
redirects only to an explicitly requested public product route. A separate
same-origin `POST /api/cms/preview/disable` route would clear that cookie. The
CMS adapter must select a draft path only after that server-side Draft Mode
check; normal published requests must never receive the preview credential, and
no browser code may receive it.

Production must unconditionally reject preview enablement. Current Sanity
built-in permissions do not offer a draft-read-only credential: draft access
requires member write access, and a Contributor token can write drafts. A future
server-only Contributor token would therefore still permit draft writes if
compromised, even though it is isolated to this endpoint and dataset. Custom
roles are Enterprise-only. No such token, secret, Draft Mode endpoint, or route
exists in this phase.
