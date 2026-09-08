# ADR 004: Server-signed, device-bound entitlements

**Status:** accepted

Lemon license status supports sonder's commercial record but macOS apps call
only the Sonder API. An installation registers a random ID and P-256 public key;
the server responds with an Ed25519-signed, time-bounded entitlement certificate
bound to that key. The P-256 private key resides in Secure Enclave when available
or Keychain otherwise. The app embeds only the Ed25519 public verification key.

This supports offline use and revocation without shipping merchant credentials
or pretending that client-side licensing is impossible to bypass.
