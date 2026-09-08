# Platform data model

The following is the initial D1 model. It is intentionally relational and small;
product-specific data stays in its own product repository and storage.

## Core records

| Record | Key fields | Purpose |
| --- | --- | --- |
| `products` | `id`, `slug`, `provider`, `provider_product_id`, `status` | Canonical product definition, such as `pulse`, with an optional commercial reference. |
| `product_variants` | `id`, `product_id`, `lemon_variant_id`, `policy` | Maps commercial variants to entitlement policy. |
| `customers` | `id`, `auth_subject`, `primary_email_hash`, provider reference | Minimal customer identity; email is hashed, not retained as raw webhook data. |
| `customer_identities` | `id`, `provider`, `provider_subject`, `verified_email`, `customer_id`, `status` | Provider-neutral login identity; a verified email is retained only for identity linking and may be linked, unlinked, or disabled. |
| `purchases` | `id`, `provider`, `provider_order_id`, `product_variant_id`, `status`, `provider_updated_at` | Commercial order reference, entitlement identity, and freshness marker without payment detail. |
| `licenses` | `id`, `entitlement_id`, `credential_verifier`, `activation_limit`, `status`, `revoked_at` | Opaque license lifecycle; only a SHA-256 verifier of the bootstrap credential is retained. |
| `entitlements` | `id`, `customer_id`, `product_variant_id`, `status` | The customer’s actual right to use a product. |
| `device_activations` | `id`, `license_id`, `key_fingerprint`, `public_key_spki`, `status`, `last_seen_at` | Revocable installation, public proof key, capacity, and last validation. |
| `activation_challenges` | `id`, `activation_id`, `nonce`, `expires_at`, `consumed_at` | One-time five-minute proof challenges; no client private key or proof is stored. |
| `licensing_rate_limits` | `scope`, `subject_hash`, `window_started_at`, `request_count` | One-minute protected-route counters keyed by route and a salted, one-way requester hash. |
| `webhook_events` | `provider`, `provider_event_id`, `received_at` | Idempotent receipt and processing state. |
| `outbox_jobs` | `id`, `kind`, `payload_ref`, `status`, `attempt_count`, `last_failure_reason` | Retryable post-webhook work. |
| `support_cases` | `reference`, `classification`, `status` | Private customer conversation and triage state. |
| `support_messages` | `case_id`, `provider_message_id` | Message metadata and controlled content reference. |
| `github_issue_links` | `case_id`, `repository`, `issue_number` | Link to actionable engineering work only. |
| `audit_events` | `actor`, `action`, `resource_type`, `resource_id` | Append-only record of consequential changes. |

## Required constraints

- Unique `provider + provider_event_id` on `webhook_events`.
- Unique `provider + provider_license_id` on `licenses`.
- Unique `provider + provider_subject` on `customer_identities`; a D1 trigger
  rejects moving an already-linked provider identity to a different customer.
- Unique active installation-key fingerprint per entitlement.
- Unique active installation-key fingerprint per license, and one license per
  entitlement when the license is Worker-issued.
- D1 `BEFORE INSERT` and `BEFORE UPDATE` triggers reject an active installation
  when the current active count for its license already equals its
  `activation_limit`; concurrent requests cannot exceed that allowance.
- Unique customer-visible support `reference`.
- One `github_issue_links` row per case/repository pair.
- Foreign keys enabled in D1 migrations and indexes on entitlement, activation,
  webhook-status, and case-status lookups.

An activation allocation, state change, and audit event occur in one D1
transaction/batch. A commerce webhook receipt, projection, audit event, and
outbox event also occur in one batch. If any statement fails, D1 rolls back the
receipt too, so a retry is safe.

## R2 implementation status

`sonder-api/migrations/0001_platform_foundation.sql` implements the records and
constraints in this document, including `purchases`, `outbox_jobs`,
`support_messages`, and `github_issue_links`. R3 adds
`0002_lemon_commerce_ingestion.sql` for provider product/customer references
and `purchases.provider_updated_at`. `src/platform/store.ts` remains the only
persistence boundary.

R6 adds `0006_customer_identities.sql`. `customers.primary_email_hash` remains
the Lemon-derived matching key; it is not replaced by an auth-provider record.
`customer_identities.verified_email` is the minimum additional personal data
needed to make an auditable provider identity link. It is never copied to audit
metadata, application logs, telemetry, or GitHub issues.

## R3 Lemon mapping

| Lemon order field | Sonder record | Stored value |
| --- | --- | --- |
| `data.id` | `purchases.provider_order_id` | Lemon order reference. |
| `first_order_item.product_id` | `products.provider_product_id` | Lemon product reference. |
| `first_order_item.variant_id` | `product_variants.lemon_variant_id` | Lemon variant reference. |
| `customer_id` | `customers.provider_customer_id` | Lemon customer reference. |
| `user_email` | `customers.primary_email_hash` | SHA-256 hash only. |
| `status`, `created_at`, `updated_at` | `purchases` | Normalized state and source timestamps. |

`webhook_events.provider_event_id` is a SHA-256 digest of verified stable event
fields: event name, resource type and ID, source timestamp, and source state.
`payload_hash` is a separate raw-body hash. Neither field stores the payload.
The R3 outbox kinds are `commerce.purchase_observed`,
`commerce.purchase_changed`, and `commerce.purchase_refunded`; they are a
future reconciliation seam and do not create entitlements.

## R4 reconciliation

Lemon's verified order projection is the commercial authority; `entitlements`
are derived state. Reconciliation uses `purchases.product_variant_id` plus the
current customer, product, and variant rows—not the outbox payload—to form the
one-time-purchase entitlement identity: one customer and one product variant.

The explicit per-variant `policy_json` grant form is
`{"entitlement":"grant"}`. Any missing, malformed, or different policy is
fail-closed and grants no entitlement. A paid purchase for an active product
with that policy becomes `active`; a refunded, cancelled, unsupported, or
otherwise non-eligible state leaves no active entitlement and revokes an
existing derived entitlement. A unique customer/variant constraint prevents
duplicate grants.

The R4 commerce worker accepts pending and failed jobs, tracks each attempt,
and records only the sanitized failure category
`entitlement_reconciliation_failed`. Its existing `completed` outbox state
means reconciliation was processed. A leased `processing` job is retried after
its availability time if a worker stops before completion. No-op replays append
no audit record. Material transitions append exactly one of
`entitlement.granted`, `entitlement.restored`, or `entitlement.revoked`.

## States

`license.status`: `active`, `expired`, `refunded`, `disabled`, `unknown`.

`entitlement.status`: `active`, `grace`, `suspended`, `revoked`.

`device_activation.status`: `active`, `deactivated`, `revoked`.

`support_case.classification`: `question`, `billing`, `bug`, `feature`,
`security`, `spam`, `unknown`.

`customer_identity.status`: `linked`, `unlinked`, `disabled`.

## Data retention

- Retain entitlement and audit history only for the legitimate operating,
  accounting, and legal period.
- Do not retain raw webhook payloads. Keep only the derived state and content
  hash; use the provider dashboard for any authorized replay investigation.
- Avoid storing email attachments by default. If support requires one, enforce
  type/size limits, private access, a short retention period, and malware review.
- Do not put raw license keys, access tokens, support bodies, or emails in
  telemetry, GitHub issues, or structured application logs.
- `credential_verifier`, key fingerprints, and rate-limit subject hashes are
  operational security data, not customer identity. Do not reverse or reuse
  them as analytics identifiers.
