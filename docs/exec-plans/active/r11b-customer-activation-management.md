# R11B — Customer activation management

## Reconciled boundary

`sonder-system/contracts/customer-licensing.json` owns the established v1 read
and revoke semantics. The website uses the Worker only server-to-server after
the existing WorkOS session check; it neither owns nor redefines license,
activation, ticket, or capacity state.

## Implementation

1. Read the private, no-store customer licensing projection on `/account`.
2. Present active product/license activation-slot usage and active device
   metadata without provider, cryptographic, credential, or internal IDs.
3. Require an explicit browser confirmation, then use the existing CSRF cookie
   and same-origin server relay for an opaque activation revoke request.
4. Refresh the server-rendered account state after success; preserve the R7/R8
   denied, Magic Auth, Google, Apple, header, and logout boundaries.

## Verification

Focused page and relay tests cover response validation, no leak, and CSRF.
Staging remains responsible for the authenticated website flow, actual D1 state,
refresh rejection, repeat revoke, ownership denial, and fixture cleanup.

## Staging result

The staging branch deployment at `staging.sonder.build` rendered the live QA
fixture as `1 of 3 used`, `2 slots available`, and one labeled device with its
dates. Its explicit confirmation invoked the CSRF-protected relay; the page
then refreshed to `0 of 3 used` and `3 slots available`. The staging Worker
rejected a valid installation-key refresh after the revoke. The fixture was
restored. The one available staging browser session is linked to the QA customer,
so cross-customer and repeat behavior remains deterministic-test evidence rather
than fabricated identity evidence.


## Local v1 response compatibility — 2026-10-23

**IMPLEMENTED / LOCALLY VERIFIED; new staging acceptance UNRUN.** The existing
[shared licensing contract](../../../../sonder-system/contracts/customer-licensing.json)
explicitly permits additive response keys and rejects unknown lifecycle values.
Affected endpoints are `GET /v1/customer/licenses` and
`POST /v1/customer/activations/{activationId}/revoke`, including their error bodies.
No new endpoint version, producer or system-contract change is required.

The website consumer accepts unknown keys on the envelope, product, entitlement,
license, activation, revoke confirmation and error object. Required known values
retain their canonical IDs/names, lifecycle, integer, nullable-string and opaque-ID
checks; arrays cannot stand in for objects. A missing optional license remains
absent. New objects project only validated known fields into account/client state,
so unknown identity/provider/authorization data cannot become trusted state.
Machine error codes must match the documented HTTP status and endpoint; unknown
codes, mismatched statuses and malformed bodies become `licensingUnavailable`.
Unexpected405/methodNotAllowed remains unavailable for these fixed-method calls,
without introducing a new UI/account state. Existing authentication, customer
linkage, entitlement, license, capacity, device-label and revocation ownership
boundaries are preserved.

Validation evidence:

- Focused registered Vitest command for `src/lib/customer-licensing.test.ts`,
  `src/app/account/page.test.tsx` and the existing revoke relay test: **87 PASS**.
- `pnpm test`: **135 PASS / 11 files**. `pnpm lint`: **PASS**.
- Direct read-only reconciliation used TypeScript AST extraction of the current
  API `test/customer-licensing.spec.ts` expected responses: website fixture equals
  its full four-product fixture; all four API success fixtures pass through the
  actual website consumer with/without recursive additive fields. Shared success
  and revoke examples and all16 documented error/status pairs pass. The contract's
  illustrative activation-ID label was replaced only with a valid opaque fixture
  ID. No API test/DB, network, provider or credential operation was executed.
- Mixed v1 producer/consumer evidence: original responses and additive responses
  yield identical known state; missing fields, invalid known types and future
  entitlement/license/activation values fail closed. Account and relay tests
  cover distinct linkage/error presentation and prevent extension-data leakage.
- Registered `pnpm build` was attempted twice, including sandbox escalation;
  Turbopack could not bind its internal worker port (EPERM), before type checking.
  Installed Next documentation supports `--webpack`; with CMS/API disconnected,
  `NEXT_TELEMETRY_DISABLED=1 SANITY_PROJECT_ID='' SANITY_DATASET='' SONDER_API_ORIGIN='' pnpm build --webpack`
  **PASS**, including TypeScript and all13 static-generation entries. Project
  bundler configuration and environment files were not changed.
- `git diff --check`: **PASS**. Final self-review found no material parser,
  production-wiring, privacy or known-field validation gap. No system/API mismatch.

No browser, credentialed staging, provider or production acceptance is claimed.
Historical R11B evidence above remains historical; fresh-target acceptance remains
blocked as recorded in the existing roadmap. This task changes only the website
consumer and its tests/documentation; no database mutation, deployment or push.

Selected follow-up at that checkpoint (completed locally below): align the existing account revoke confirmation with the
shared perpetual/offline entitlement effects. Its current blanket ticket-expiry
wording does not express continued perpetual offline use until reconnection;
change presentation and focused tests only, keeping revocation semantics intact.


## Local revoke-confirmation semantics — 2026-10-23

**IMPLEMENTED / LOCALLY VERIFIED; browser and new staging acceptance UNRUN.**
Baseline website `ff09669`. Reconciled the shared customer-licensing revocation
contract and browser-activation offline-first v2 policy against API
`licensing-lifecycle.ts` / `activation-revocation.ts`: revocation marks only the
activation revoked and releases its slot; it does not revoke the entitlement.
Already-revoked requests remain idempotent. The next successful online refresh
rejects the installation. Valid perpetual offline access has no arbitrary expiry;
time-limited offline access ends at the signed end timestamp. Legacy v1 ticket
expiry is not reinterpreted; the website receives no ticket version or entitlement
kind, so the confirmation describes conditional semantics rather than guessing
which ticket a device holds. No shared contract/API mismatch or ambiguity found.

The confirmation now reads:

> Revoke activation for [device label]? This frees its activation slot without
> revoking your product entitlement. An offline device with a valid perpetual
> entitlement can keep using the app until its next successful online check.
> Time-limited offline access ends at its signed end date.

Existing `Revoking…` pending feedback retains the last server-provided counts.
Confirmed success announces `Activation revoked. Your product entitlement is
unchanged.` and requests the existing server refresh; counts are never adjusted
optimistically. Existing401/403/404 rejection feedback remains a failure without
changing entitlement state. CSRF/pre-request failure says the operation could
not start. A lost response,408,5xx, malformed or unconfirmed success response says
`We could not confirm whether this activation was revoked. Refresh your account
to check its status before trying again.` A refresh exception after confirmed
success explicitly says revocation succeeded but the activation list could not
refresh. No expiry countdown, immediate offline invalidation or automatic retry.

Validation:

- Registered focused Vitest: account activation-management, account page and
  revoke relay suites — **34 PASS / 3 files**, including15 new component tests.
- `pnpm test` — **150 PASS / 12 files**. `pnpm lint` — **PASS**.
- `NEXT_TELEMETRY_DISABLED=1 SANITY_PROJECT_ID='' SANITY_DATASET='' SONDER_API_ORIGIN='' pnpm build --webpack`
  — **PASS**, including TypeScript and page generation. The documented Webpack
  alternative avoids the already-recorded local Turbopack worker-port restriction;
  no bundler configuration or environment file was changed.
- `git diff --check` — **PASS**; final self-review preserves the server-authoritative
  count/entitlement path, same-origin CSRF relay and existing error boundaries.
  Node interaction tests invoke the real component callbacks/JSX with a small
  mocked hook/router harness; they are not mounted-browser or accessibility proof.

No API mutation, database/provider request, credential work, infrastructure,
deployment, production operation or push. Historical R11B staging evidence and
fresh-target blockers retain their original scope.

Next product-facing task: add an explicit account refresh action for uncertain
revocation outcomes, using the existing server read path without automatically
retrying the mutation or guessing activation/capacity state.
