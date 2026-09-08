# Product platform architecture

## Goal

Provide a small shared foundation for Pulse, Frame, Crate, Cue, and future
sonder products. It must serve product needs without replacing product-specific
code or becoming a second application framework.

## Chosen boundary

| Concern | System | Responsibility |
| --- | --- | --- |
| Public site and future account UI | Next.js on Vercel | Marketing, product pages, authenticated account presentation. |
| Product API | Existing Cloudflare Worker at `api.sonder.build` | Product integrations, webhooks, entitlements, activations, and support workflow. |
| Operational database | Cloudflare D1 | Entitlements, activations, webhook idempotency, cases, and audit records. |
| Commerce | Lemon Squeezy | Checkout, merchant-of-record operations, invoices, refunds, subscriptions, and generated licenses. |
| Email | Resend | Transactional mail and inbound support delivery. |
| Engineering record | GitHub | Repositories, private issues, project views, releases, and CI. |
| Product monitoring | Sentry, TelemetryDeck, Sparkle | Errors/releases, aggregate usage, and signed macOS updates. |

```text
Customer ──> sonder.build (Vercel: site and future account UI)
                         │
macOS apps ──────────────┼──> api.sonder.build (existing Cloudflare Worker)
                         │             │
                         │             ├── D1: platform records
                         │             ├── Lemon: commerce webhooks and status
                         │             ├── Resend: inbound support webhook
                         │             └── GitHub App: actionable private issues
                         │
                         └── account UI calls only documented Worker endpoints
```

The Worker is the only service that interprets commerce events or issues product
entitlements. Vercel never holds Lemon credentials or the entitlement signing
key. Lemon remains the authority for purchase and refund events; sonder derives
access from verified webhooks and reconciliation, never from a checkout return
URL.

## R6 customer authentication boundary

The Vercel website sends a server-side WorkOS access token only to
`GET /v1/customer/session`; browsers never choose a customer ID or forward a
raw email for lookup. The Cloudflare Worker verifies the WorkOS JWT's RS256
signature against the client-scoped WorkOS JWKS, exact
`https://api.workos.com/user_management/<WORKOS_CLIENT_ID>` issuer, matching
`client_id`, non-empty subject, and expiry. Native first-party AuthKit tokens
have no required `aud` claim. It then retrieves the verified WorkOS user using
its own secret API key. Only that provider result can be used to resolve an
internal customer identity.

The endpoint returns only the internal identity/customer relationship required
by the website's authenticated placeholder. It intentionally returns no
entitlements, licenses, purchases, or activation data. There is no browser CORS
surface in R6 because the Vercel server calls it directly.

## R3 Lemon ingestion boundary

`POST /webhooks/lemonsqueezy` is a Worker-only endpoint. It reads the raw body
once, verifies Lemon's `X-Signature` HMAC-SHA-256 before JSON parsing, then
uses one D1 batch for the webhook receipt, commerce projection, audit event,
and outbox job. It does not log or persist raw payloads, email addresses,
license keys, or secrets.

Lemon's documented one-time order events are `order_created` and
`order_refunded`. The projection maps the order's product, variant, customer
reference, purchase status, and provider timestamps. A later verified order
representation for the same order updates the projection only when its source
timestamp is not older. Subscription events are receipt-stored and ignored in
R3; R4 is the first entitlement-reconciliation milestone.

## R4 entitlement reconciliation boundary

Commerce outbox jobs are durable prompts to reconcile, not the authority for a
final entitlement decision. The server-internal `reconcilePendingEntitlements`
function claims a pending or retryable commerce job, then re-reads the current
purchase, customer, product, variant, and any entitlement from D1. It therefore
uses the latest Lemon-projected purchase state: a late paid event cannot restore
an entitlement after a newer refund has already projected `refunded`.

This is intentionally an internal invocation seam, not a public HTTP route,
cron, or queue. A verified Lemon webhook starts it through the Worker's
background context; the endpoint response remains the commerce receipt result.
Entitlement mutation, transition audit append, and outbox completion are one D1
batch; an error leaves the job retryable instead of claiming completion.

## R5 licensing boundary

The Worker is also the sole license-activation authority. Its four public
native-app routes are `POST /v1/licenses/activate`, `/challenge`, `/refresh`,
and `/deactivate`. License bootstrap is deliberately server-internal: it
creates one opaque credential for an eligible entitlement, returns it only to
the trusted bootstrap caller, and stores only its one-way verifier in D1.

An installation registers a P-256 SPKI public key; its private key remains on
the Mac. Challenge proofs authorize refresh and deactivation. The Worker signs
short-lived entitlement tickets with a distinct Ed25519 private key held only
in the Cloudflare secret store. The future Vercel account UI calls documented
Worker routes and never holds commerce or signing secrets.

## Shared-platform rules

- Add a product as data and a narrowly scoped API module; do not clone a new
  licensing system per app.
- Keep Discogs/TIDAL integrations independent from future platform records.
  Their existing KV state remains scoped to their routes.
- Do not send app clients directly to Lemon for license validation.
- Keep account V1 focused on ownership, downloads, and activations. It is not a
  profile, organization, or team-management product.
- Do not add a queue, Durable Object, R2, Postgres, or another auth vendor until
  a documented requirement exceeds Worker plus D1 capabilities.

## When to reconsider D1

Move to Postgres only for a demonstrated requirement such as advanced reporting,
Postgres-only extensions, high-volume relational querying that D1 cannot meet,
or production-like database branches per preview. A migration is an explicit
architecture decision, not a pre-emptive optimization.
