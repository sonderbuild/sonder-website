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
