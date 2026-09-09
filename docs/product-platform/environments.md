# Environments

## Boundary

Production data must never be needed for local development or a website preview.
Every provider credential, webhook, database, and host is scoped to an
environment.

| Environment | Website | Worker | Data and commerce | Purpose |
| --- | --- | --- | --- | --- |
| Local | `pnpm dev` | `wrangler dev --local` | Local D1 and fake provider payloads | Development and tests. |
| Preview | Vercel preview URL | No shared production Worker | No customer data or live commerce | Marketing/UI review only until an API preview exists. |
| Staging | Protected URL | Named staging Worker | Separate D1, Lemon test store, Resend test receiving domain | End-to-end integration tests. |
| Production | `sonder.build` | `api.sonder.build` | Production D1 and live provider credentials | Customers only. |

## Rules

- Create a named Worker staging environment before the first platform endpoint;
  it must have separate KV/D1 bindings and secrets.
- Use Cloudflare `.dev.vars` only for local Worker secrets and keep it ignored.
  Declare required secret names in `wrangler.jsonc`; never values.
- Use Vercel environment variables only for website-only values. The website
  must not receive Worker, GitHub App, or Lemon private credentials.
- Use Lemon test mode and separate webhook secrets in staging. Exercise signed
  order creation, duplicate delivery, a newer order representation, and refund
  there first. Subscription events are intentionally not acted on in R3.
- Protect Vercel previews. Preview URLs must not gain production account access
  merely because they share source code.
- The API accepts browser requests only from explicitly allowed production and
  staging account origins. Native-app endpoints use their own authorization and
  must not depend on browser CORS as an access control.

## D1 lifecycle

- The Worker binding is `PLATFORM_DB`; the intended remote database name is
  `sonder-platform`. Its all-zero configuration ID is a local-test placeholder,
  not a database to deploy against.
- Version schema changes as sequential SQL migrations in `sonder-api`.
- R2 begins with `migrations/0001_platform_foundation.sql`; migration tracking
  uses Wrangler's default `d1_migrations` table.
- Apply and test every migration locally first, then staging, then production.
- Never point local Wrangler at the production D1 database.
- Before customer data exists, document an encrypted export and tested restore
  process, owner, cadence, and retention period.

## R3.1 staging resources

- The named staging Worker is deployed as `sonder-api-staging` at
  `https://sonder-api-staging.sonderbuild.workers.dev`. Its public webhook
  endpoint is protected by Lemon signature verification; health is intentionally
  public and no platform-record debug endpoint exists.
- Staging D1 is `sonder-platform-staging` in WEUR. Migrations
  `0001_platform_foundation.sql` and `0002_lemon_commerce_ingestion.sql` were
  applied with `npx wrangler d1 migrations apply PLATFORM_DB --remote --env
  staging` and verified in the staging `d1_migrations` ledger.
- The staging-only KV bindings are `OAUTH_STATE` →
  `sonder-api-staging-oauth-state` and `OAUTH_COMPLETION` →
  `sonder-api-staging-oauth-completion`. They are distinct from the existing
  default-environment namespaces.

## Lemon webhook secret and test mode

- The Worker requires `LEMON_SQUEEZY_WEBHOOK_SECRET`. It is declared by name
  only in `wrangler.jsonc`; no value belongs in source control, Vercel, or a
  browser bundle.
- For local manual Worker development, add a distinct test-only value to the
  ignored `sonder-api/.dev.vars` file as
  `LEMON_SQUEEZY_WEBHOOK_SECRET=<local-test-signing-secret>`. Vitest supplies
  its own deterministic non-production binding and does not read a committed
  secret file.
- For staging, after a named staging Worker environment and its separate D1
  binding exist, set the matching secret interactively with
  `npx wrangler secret put LEMON_SQUEEZY_WEBHOOK_SECRET --env staging` from
  `sonder-api`. The R3.1 staging secret is configured; do not pass any future
  secret value as a command argument.

### Required Lemon dashboard actions for staging

1. Switch Lemon Squeezy to **Test mode** and create a webhook for
   `https://sonder-api-staging.sonderbuild.workers.dev/webhooks/lemonsqueezy`.
2. Select `order_created` and `order_refunded`; do not select subscription
   events for the R3 acceptance test.
3. Enter the same newly generated test-mode signing secret in Lemon and via the
   interactive Wrangler command above.
4. Create a test order, use Lemon's webhook simulation or retry facility for a
   duplicate, then simulate `order_refunded`. Confirm receipt, purchase, audit,
   and outbox rows only in the staging D1 database.

### R3.1 verification record

- Lemon Test Mode `order_created`, its resend, and `order_refunded` were
  verified against staging. The webhook receipt ledger contains two processed
  lifecycle events, while the projected purchase is singular and `refunded`.
- The resend produced no second purchase, audit event, or outbox job. There is
  one `commerce.purchase_observed` record and one
  `commerce.purchase_refunded` record in each of the audit and outbox tables.
- The staging schema contains no raw webhook-payload column; only a one-way
  payload hash is retained for operational correlation. This validation did
  not inspect or export customer, order, or payload data.
- R4 reconciliation is triggered only in the Worker's background context after
  a verified Lemon webhook; it adds no public processing endpoint or staging
  secret.
- R4 staging verification requeued the existing Test Mode refund after creating
  one staging-only active derived entitlement. The signed resend revoked that
  entitlement, appended one `entitlement.revoked` audit event, completed the
  refund job on its second staged attempt, and left no failed job. This fixture
  contains no production or customer-facing entitlement.

No R3 action authorizes a production webhook or production deployment.

## R5 staging signing key

- `ENTITLEMENT_SIGNING_PRIVATE_KEY_PKCS8` is a staging-only Ed25519 PKCS#8
  secret. Configure it interactively from `sonder-api` with
  `npx wrangler secret put ENTITLEMENT_SIGNING_PRIVATE_KEY_PKCS8 --env staging`.
  Never pass the value on a command line, commit it, or copy it to Vercel.
- Retain the corresponding non-secret public verification key outside the
  repository, labelled with `ENTITLEMENT_SIGNING_KEY_ID` (currently
  `staging-ed25519-v1`). It is needed to independently verify staging tickets
  and is safe to embed in an app only after it has been recorded and reviewed.
- R5 migration `0004_licensing_activation.sql` applies only through
  `npx wrangler d1 migrations apply PLATFORM_DB --remote --env staging` before
  the staging Worker deploy. Its test records must use synthetic IDs and no
  customer email, commerce payload, or production credential.

### R5 staging verification record

- `0004_licensing_activation.sql` is applied to `sonder-platform-staging`, and
  `sonder-api-staging` is deployed with only its staging D1/KV bindings and the
  two named staging secrets.
- A synthetic no-PII entitlement exercised activation, idempotent
  reactivation, a three-slot limit, P-256 challenge/refresh, replay and
  wrong-key rejection, deactivation, slot reuse, and entitlement revocation.
  Activation and refresh tickets independently verified with the retained
  `staging-ed25519-v1` public key.
- The fixture ended revoked and is not usable. Aggregate inspection confirmed
  one-way credential verifier storage, public keys only (no private-key,
  signature, or credential columns), expected material audit events, and no
  secret values in the Worker secret listing.

### R5.1 staging verification record

`0005_atomic_activation_capacity.sql` is applied only to
`sonder-platform-staging`, and `sonder-api-staging` is deployed with the
trigger invariant. A no-PII fixture with allowance two and one existing active
installation received two concurrent distinct activation requests: exactly one
returned success, one returned `activationLimitReached`, and the persisted
active count was exactly two. The fixture was then revoked, disabled, and left
with zero active installations.

## R6 WorkOS staging configuration and verification

R6 must use a separate WorkOS test environment/application and a protected
staging Vercel deployment. Do not reuse a production WorkOS key, cookie secret,
redirect URI, or user directory for local or staging work.

### Staging configuration

1. In the WorkOS test environment, enable **Magic Auth** and **Google OAuth**.
   WorkOS default Apple credentials may enable **Apple OAuth** in staging only;
   do not enter sonder-owned Apple credentials until production readiness.
   Disable passwords and every other social provider. Do not add
   passkey controls to the R6 custom UI: WorkOS currently supports passkeys only
   through hosted UI. Add
   `https://staging.sonder.build/login` as both the Sign-in URL and the
   compatibility redirect URI required by the AuthKit Next session proxy, and
   add `https://staging.sonder.build/api/auth/social/callback` to the WorkOS
   application's allowed Redirects. In Google Cloud, register the separate
   WorkOS-provided Google redirect URI, then store the Google client ID and
   secret only in the WorkOS test provider configuration.
2. In Vercel's staging environment, set `WORKOS_CLIENT_ID`,
   `WORKOS_API_KEY`, a unique 32+-character `WORKOS_COOKIE_PASSWORD`,
   `NEXT_PUBLIC_WORKOS_REDIRECT_URI=https://staging.sonder.build/login`, and the
   server-only `SONDER_API_ORIGIN=https://sonder-api-staging.sonderbuild.workers.dev`,
   `WORKOS_SOCIAL_PROVIDERS=google,apple` when WorkOS staging Apple is enabled, and
   `WORKOS_SOCIAL_REDIRECT_URI=https://staging.sonder.build/api/auth/social/callback`.
   No Worker, Lemon, or signing private key belongs in Vercel.
3. In the API repository, set the staging-only values interactively—never as
   command arguments:

   ```zsh
   npx wrangler secret put WORKOS_API_KEY --env staging
   npx wrangler secret put WORKOS_CLIENT_ID --env staging
   ```

   The Worker derives the exact native AuthKit issuer from `WORKOS_CLIENT_ID`:
   `https://api.workos.com/user_management/<WORKOS_CLIENT_ID>`. It verifies
   signatures against `https://api.workos.com/sso/jwks/<WORKOS_CLIENT_ID>` and
   requires `client_id`, `sub`, and `exp`; it does not require `aud`. No custom
   AuthKit domain is configured for R6.
4. Apply `0006_customer_identities.sql` only to staging, deploy only
   `sonder-api-staging`, then deploy the protected staging website. Production
   remains untouched.

### Required staging verification record

Record completion only after exercising a WorkOS test user through the custom
Magic Auth flow. Confirm that `/login` remains on `staging.sonder.build` while
requesting and verifying the code, that successful verification creates a
Secure, HttpOnly server session, and that sign-out remains functional. Passkeys
are not a staging test for this custom flow until WorkOS supports a custom
passkey API. Then verify the website's server-side lookup links only a
synthetic Lemon-projected customer with the same verified email; a different
verified email returns the unlinked state; and an invalid, expired, wrong-
issuer, or wrong-client token is rejected by the staging Worker. Inspect only
synthetic identity rows and sanitized audit actions, then disable or delete the
synthetic fixture in the WorkOS test environment and staging D1.

**Status:** staging verification complete on 2026-09-09. The custom Magic Auth
flow remained on `staging.sonder.build`; its server session authenticated the
website-to-Worker request. The Worker accepted the client-scoped AuthKit issuer,
performed the provider user lookup, and persisted one unlinked identity plus
one `identity.unlinked` audit event. The recent audit window contained no
commerce, entitlement, license, or activation event. A subsequent signed Lemon
Test Mode `order_created` for that verified email created exactly one matching
customer, purchase, and legitimate derived entitlement. The next authenticated
lookup linked the same identity and appended one `identity.linked` audit event;
a repeat login added neither an identity row nor a material identity audit
event. No license or device activation was created by commerce or authentication.

### R6.2 Google staging verification

**Status:** staging verification complete on 2026-09-09. The branch Preview
showed Google only; Apple was neither visible nor configured. After the WorkOS
test application allowlisted the sonder social callback, Google authorization
went through WorkOS to Google and the completed user flow returned to
`/account`. Magic Auth and sign-out were also rerun successfully on the same
Preview. Sanitized D1 aggregates for the existing QA customer showed exactly
one matching customer, one linked identity, and one `identity.linked` audit
event. Its one purchase and one entitlement were the pre-existing Lemon Test
Mode commerce projection; it had zero licenses and zero device activations.
The same-subject Google login therefore added no identity, audit, entitlement,
license, or activation row. Automated R6.2 coverage exercises cancellation,
invalid state, disabled-provider rejection, unknown identity, and second-subject
collision; those negative paths remain fail-closed.

### R6.3 Apple and header staging verification

**Status:** staging verification complete on 2026-09-09. WorkOS staging default
Apple credentials were enabled without sonder Apple secrets, and the Preview
allowlist was set to `google,apple` with the existing
`https://staging.sonder.build/api/auth/social/callback`. The Apple button was
visible only after that explicit configuration. Apple authorization showed
expected WorkOS branding, completed through the existing callback to `/account`,
and used the same sealed website session. The shared header showed `Account`
for the session and `Sign in` after sign-out; it showed neither user data nor a
client-side session flash. Magic Auth and Google retain their previously
verified staging paths. The final privacy-safe D1 inventory was one linked and
two unlinked identities; one `identity.linked` and three `identity.unlinked`
audits; four entitlements, two licenses, and six activations. Those global
counts are not a before/after attribution record. The website authentication
routes have no commercial mutation path, and no production WorkOS, Vercel,
Cloudflare, DNS, data, or deployment changed.

## R7 read-only account staging verification

On 2026-09-09, `sonder-api-staging` deployed the established
customer-session cache policy and returned the unauthenticated contract response
with `Cache-Control: private, no-store`. The authoritative website acceptance
target is Vercel Git Preview `dpl_4r1nos7Qms2uUvrUQTrHpDuiYFjq` for staging
commit `6225ef41bd461fcd26919967e76069de3fa5b9a6`; both
`staging.sonder.build` and the staging branch alias resolved to that same Ready
Preview. The earlier dirty custom-environment deployment had no staging-domain
alias and was excluded from acceptance.

The signed-out `/account` route redirected to `/login` and the header showed
`Sign in`. The linked Magic Auth QA session rendered the connected-account
state with `Account` in the header and no identity, customer, email, provider,
or commercial value rendered. After sign-out, the header returned to `Sign in`.
The unlinked Google QA session rendered only the distinct no-customer-account
state, with no customer or commercial information. `accountDisabled` and
`emailNotVerified` remain deterministically covered by the targeted API suite;
staging identities were not altered to fabricate either state.

Read-only D1 before/after aggregate checks remained at 2 purchases, 4
entitlements, 2 licenses, and 6 activations. The after query recorded zero
writes. The aggregate audit-event count was 17, but its newest entry preceded
this acceptance window; it is not evidence of a R7 mutation. This verification
made no production change.

## R8 effective ownership staging status

R8 has no staging deployment or acceptance evidence yet. Before staging
verification, `sonder-api` must intentionally map the isolated staging Lemon
product/variant to one canonical Sonder product ID under its provider-mapping
policy; existing provider projections remain unmapped by design. The existing
Lemon `pulse` test fixture is not evidence of that mapping.

After the approved staging-only deployment, verify the linked QA account's
effective entitlement projection, confirm each product appears at most once and
contains no provider identifier, exercise Magic Auth, Google, and sign-out, and
record before/after read-only D1 aggregates showing no entitlement, license, or
activation mutation. Production remains excluded.
