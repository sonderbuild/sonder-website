# R14 Phase 2A — published-content integration

## Goal

Connect the local Sanity Studio and the existing public-only Pulse adapter to
the authorized `sonder-marketing` staging dataset. Publish exactly one Pulse
marketing document seeded from the source fallback, without any API, preview,
or production credential.

## Invariants

- `wbzwvwu5` / `staging` remains public and contains only the one Pulse
  `productMarketing` document created by this phase.
- Normal website reads are anonymous, published-only requests. They use no
  Sanity API token.
- Pulse is the sole CMS-backed public route. Frame and Crate remain
  source-owned; Cue remains unroutable.
- Invalid, unavailable, duplicate, missing, or mismatched CMS content falls
  back completely to source-controlled content.
- Draft preview remains unimplemented. A later proposal must keep its
  write-capable credential server-only, out of normal requests and browser
  code, and disabled in production.
- Normal runtime is Free-compatible: it requires only project ID, dataset name,
  and API version—not private datasets, custom roles, write-capable tokens, or
  Growth-only features.

## Verification

1. Start the local Studio with only public project/dataset/API-version values.
2. Query published content anonymously, then prove an anonymous query does
   not reveal a deliberately created unpublished document.
3. Run the local website with Sanity configured and inspect `/apps/pulse`;
   verify source-owned routes and account/auth/licensing surfaces separately.
4. Run the registered system and website checks plus a secret scan and diff
   whitespace check.

## Preview credential decision

Sanity's current built-in Contributor permission writes drafts and does not
publish. First-party documentation states that draft access or mutations need
an authenticated project member with write access. No narrower built-in
draft-read role is offered; custom roles are Enterprise-only. Any later
Contributor token therefore retains draft-write capability if compromised and
remains a separate product/security decision.

## Completion record

- The local Studio started against `wbzwvwu5` / public `staging` using only
  ignored `SANITY_PROJECT_ID`, `SANITY_DATASET`, and `SANITY_API_VERSION`
  values.
- `product-marketing-pulse` is the single published `productMarketing` record.
  It was seeded from the source fallback; its branded SEO title provides an
  observable published-content fingerprint.
- An anonymous query returned the Pulse record. A temporary unpublished probe
  was not returned anonymously and was deleted immediately afterward.
- A local HTTP check returned 200 for `/apps/pulse` with that published title,
  200 source-owned Frame and Crate pages, 404 for Cue, and the independent
  `/account` redirect to `/login`. The temporary WorkOS values used only to
  initialize existing local middleware were not saved.
