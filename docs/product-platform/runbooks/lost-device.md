# Lost device

1. Verify account ownership through the normal account session or support review.
2. If the device appears in `/account`, use its explicit customer revocation
   control. The same-origin website relay confirms the session and CSRF proof;
   it never accepts a copied ticket or a browser-provided customer ID.
3. A successful revoke frees one activation slot immediately. The removed
   device's existing ticket remains usable only until its normal expiry; a later
   online refresh fails closed.
4. If the device is not present or account access cannot be recovered, use the
   controlled support reset procedure and record actor, reason, evidence class,
   and affected activation only.
5. Confirm the slot is free for the replacement. Do not reveal credentials,
   public-key fingerprints, or unrelated activation data.
