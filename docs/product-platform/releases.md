# Product releases

## Versioning

Each macOS product uses semantic customer versions:

- `MAJOR`: an intentionally substantial, incompatible, or materially changed
  product release.
- `MINOR`: a backwards-compatible customer-facing feature release.
- `PATCH`: a bug fix or small safe improvement.

`CFBundleShortVersionString` is the customer version, such as `1.4.0`.
`CFBundleVersion` is the monotonically increasing build number. A release tag is
`pulse-v1.4.0`; the matching GitHub Release is `Pulse 1.4.0`.

## Release contract

The same build version must drive the app bundle, Git tag, GitHub Release,
release notes, Sentry release, and Sparkle appcast entry. Ship signed Sparkle
updates on `stable`; use a separate `beta` channel only for opted-in testers.

Before release, confirm entitlement policy changes, migration compatibility,
Sentry data scrubbing, update signature, rollback path, and release notes. Do
not add platform features in the same release window as a risky licensing or
commerce migration.
