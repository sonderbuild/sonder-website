# Product publishing architecture

Reviewed locally: 2026-10-23. This document owns website publishing design, not
shared product contracts, provider configuration or release acceptance.

## Current production path and ownership

`src/data/products.ts` → `/apps` cards and `/apps/[slug]` static params/lookup →
catalog-selected CMS read or source content → shared hero/sections and metadata.
The current routes remain Monitor, Frame and Crate; Cue is a canonical product
without a public route. `/apps` cards remain source-controlled, including Monitor.

| Layer | Authority / current implementation |
| --- | --- |
| Stable identity and platform semantics | `sonder-system/PRODUCTS.md` and `contracts/customer-products.json`; website projection in `src/data/product-identities.ts`, also used by Studio. API provider mappings and account/licensing consumers retain their own shared contracts |
| Public catalog and routing | Website `Product.id` references canonical identity; `slug` is a separate route key. Current values match by deliberate configuration, never derivation. `marketingSource` explicitly opts each catalog entry into `source` or `sanity` |
| Editorial content | Sanity `productMarketing`: title/tagline/hero, ordered feature sections, image media, FAQ, SEO; productId references the canonical list. Current published-content opt-in is Monitor only |
| Commerce, licensing and entitlements | API, shared contracts and Lemon configuration. No prices, variants, entitlement mappings, authentication or customer state in CMS |
| Release/download availability | Product/release owners; no download resolver, purchase CTA or signed update integration is implemented by this preparation |
| Shared presentation | Website hero, card, section and media components. Rendering remains shared across products; no product-specific page duplication |

The tokenless server adapter queries the public dataset with a bound canonical
ID, normalizes known editorial fields, and accepts exactly one matching record.
Missing config, failed/timeout requests, malformed content, duplicate/missing
records and wrong identities fall back entirely to local content. Normal fetches
have a three-second abort and 60-second Next revalidation. Local fixtures prove
branch behavior, not Sanity availability or current published dataset contents.

## Capability and gap assessment

| Area | Current support | Next boundary |
| --- | --- | --- |
| Multiple product pages | Shared route/layout and data catalog; current names/routes preserved | Add catalog data and approved identity, never clone routes |
| Lifecycle: draft/upcoming/available/maintained/archived | Only source-owned display string `In development`; CMS publishing state is separate. No typed lifecycle or selling/availability policy | Decide visibility/navigation/404 versus retained archived pages and a release-availability owner before implementing lifecycle transitions; CMS publication alone cannot enable purchase/download |
| Content blocks | Statements and feature highlights normalized; source also supports text sections | Evolve schema/normalizer/renderer additively; keep existing documents/fallbacks valid |
| Images/screenshots | Sanity image refs → validated HTTPS URLs → shared Next Image; local placeholders without assets | Product-specific approved media, alt text and image-host configuration; no production asset seeding here |
| Video/demo | Source renderer supports video/gif/iframe, CMS currently images only | Define allowed hosts, privacy/loading behavior and accessible fallbacks before CMS schema expansion |
| Platform requirements | Source-owned platform/category; no typed minimum OS/hardware requirement model | Use product specification (Monitor currently macOS 26+ Apple Silicon), then model validated source/release-owned requirements; do not treat package deployment baselines as product minimums |
| Localization | Website English only, root `lang=en`; no locale field/query or translated routes | Decide locales, canonical URLs and missing-translation fallback before document identity/query changes |
| SEO | Source title/description, CMS title/description for Monitor through shared route | Social image is normalized but not emitted; canonical/locale/Open Graph expansion needs focused metadata coverage |
| FAQ and support | FAQ normalized but not rendered; support/contact pages and account help remain source-owned | Reuse a shared FAQ presentation when wanted; approved support links must not carry account/customer or operational state |
| Release notes/changelog | Release contract exists; no CMS changelog schema or route | Release owner verifies version/artifact/availability; optional editorial notes reference that release, never create it |
| Preview versus published | Anonymous published reads only; no Draft Mode route/token | Existing `sanity/README.md` preview proposal is deferred. Separate authorization needed for draft-write-capable credential and enable/disable/security design; production preview remains forbidden |
| Missing/unpublished CMS content | Full source fallback; no new routes can be created by a CMS record | Retain fallback for every routed product; Studio validation cannot enforce global per-product uniqueness |

R14's staging publication and Monitor rename receipts remain in the original
[plan](../exec-plans/active/r14-published-content-integration.md). They do not
verify current provider content or accept a fresh platform environment. The
Monitor seed remains unchanged; there is no new seed, publication or remote read.

## Onboarding and next implementation

1. Reconcile the product specification and final business naming with company
   [ownership](../../../sonder-docs/ownership.md) and shared identity authority.
   The [Mactric candidate](../../../sonder-docs/decisions/008-monitor-public-name.md)
   is not a route/identity rename grant.
2. For an already-approved canonical identity, add one catalog record with an
   explicit unique `id`, unique stable `slug`, source-owned facts, fallback
   sections and deliberate `marketingSource`. Shared ID additions require system
   contract reconciliation and website/Studio projection update first.
3. Create editorial content only in the separately authorized dataset. Local
   synthetic tests can exercise any catalog fixture without publishing a product.
   Enabling another product's CMS path changes its content source and needs a
   bounded publication task, not an accidental generic-route side effect.
4. Verify fallback and published metadata/rendering, uniqueness, product isolation
   and unchanged source-owned siblings using local tests/lint/typecheck/build;
   then, under separate authorization, prove actual published/unpublished behavior.
5. Treat commerce mapping, availability, checkout/download controls, licensing,
   signing/update feeds and release as separate owner acceptance. A public
   marketing page can exist before any of those capabilities.

**Next by business value:** clear/finalize the candidate name, then authorize a
bounded Monitor launch-content pass: approved screenshots, factual requirements,
FAQ and SEO. Decide whether cards should also consume the editorial title before
changing a public name, so listing and detail cannot diverge. Retain `monitor`
identity/URL unless the separate migration explicitly changes them. Adding Frame
or Crate to Sanity is then a data/publication task using the same path, after its
own product readiness/content approval.

Larger migrations must separately specify schema compatibility, content export,
locale/document uniqueness, fallback behavior, preview credentials if any,
release/availability authority, local and authorized runtime verification and
rollback. They are not implemented by this structural preparation.
