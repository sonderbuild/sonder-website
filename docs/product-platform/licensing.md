# Licensing and activation

## Ownership model

Lemon Squeezy generates purchases and licenses. sonder consumes signed commerce
events and turns them into its own entitlement records. The macOS application
talks only to `api.sonder.build`, never to Lemon directly.

## R5 license and activation protocol

For an active derived entitlement, the Worker creates one opaque sonder license.
Its random activation credential is returned only at first internal bootstrap;
D1 retains a SHA-256 verifier, never the credential itself. A revoked
entitlement or disabled license fails closed for issuance, activation, refresh,
and ticket renewal.

`POST /v1/licenses/activate` accepts that credential plus a base64url P-256
SPKI public key and optional user-selected device label. The private key stays
in Secure Enclave where available (otherwise Keychain); Sonder stores the public
key, its fingerprint, and no hardware fingerprint. Active installations are
counted per license (three by default). Same-key activation is idempotent;
deactivation immediately frees a slot.

Refresh and deactivation use a one-time five-minute challenge. The P-256 key
signs canonical JSON containing protocol version, `POST`, exact path,
activation ID, challenge ID and nonce, issued time, and a SHA-256 digest of the
unsigned request body. Challenges are bound to one activation and consumed once;
the server accepts five minutes of clock skew. Protected routes use a
pseudonymous, D1-backed per-IP short-window limit and retain no raw IP.

Tickets are compact Ed25519-signed `header.payload.signature` values. Header
and payload are deterministic JSON with schema version and `kid`; payload holds
only product, opaque license/entitlement/activation IDs, installation-key
fingerprint, issued/expiry times, and no email, name, Lemon data, or secret.
Tickets last seven days; apps should refresh daily and must fail closed once a
ticket expires. Revocation reaches an online app on the next refresh and an
offline app no later than ticket expiry.

The Worker secret `ENTITLEMENT_SIGNING_PRIVATE_KEY_PKCS8` is an Ed25519 PKCS#8
private key. Clients embed only the corresponding public key. Rotation publishes
a new public key and `kid`, verifies prior tickets during a bounded overlap, and
retires a compromised private key by stopping its `kid` immediately.

```text
Mac app -> sonder API -> validated local entitlement and Lemon-backed status
Lemon   -> signed webhook -> sonder API -> D1 entitlement state
```

This keeps store credentials and product policy out of shipped apps, provides a
single account view, and permits reliable revocation.

## Activation protocol

1. The installed app generates a random installation ID.
2. It creates a P-256 signing key in the Secure Enclave when available; the
   fallback private key stays in the macOS Keychain.
3. The app registers only the public key and a customer-approved device label.
4. The Worker checks entitlement status and remaining activation capacity, then
   records the activation and one consequential audit event together. A signing
   failure occurs before this mutation, so it cannot consume an activation slot.
5. The Worker returns an entitlement certificate bound to the installation
   public-key fingerprint.
6. The Worker signs that certificate with its server-side Ed25519 key. The app
   contains only the corresponding public verification key and accepts current
   and previous key IDs during a planned rotation.

The Secure Enclave key is P-256, not Ed25519. Ed25519 is used only for the
server-signed entitlement certificate.

## Certificate policy

The certificate carries a product identifier, edition/features, entitlement ID,
activation ID, installation-key fingerprint, issue time, expiry time, and key
ID. It contains no Lemon license key, purchase email, or server secret.

Offline validity and activation limits are product policy. Define them before a
product is sold; start conservative and favour legitimate offline use over an
arbitrary anti-piracy deadline. The app refreshes online before expiry and
handles revoked, refunded, expired-subscription, or deactivated states clearly.

## Security properties and limits

- D1 `BEFORE INSERT` and reactivation triggers enforce each license's active
  activation allowance at the write boundary; never rely on a client counter or
  a preceding count query. The route's count is only a fast rejection path, so
  concurrent final-slot requests cannot both succeed.
- Store raw Lemon keys only when operationally unavoidable, encrypted at rest,
  and never return or log them.
- Device labels are customer-controlled display names, not hardware fingerprints.
- Provide self-service deactivation and a support reset path with audit events.
- Client-side licensing cannot be uncrackable on a customer-controlled Mac. The
  objective is to deter casual sharing, preserve a good customer experience, and
  make server-side revocation reliable.
