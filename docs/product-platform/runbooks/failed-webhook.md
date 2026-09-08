# Failed webhook

1. Identify the provider, environment, receipt hash, and endpoint; do not paste
   payloads, customer email, license keys, or signing secrets into an issue or
   log.
2. For Lemon, confirm the request targeted `POST /webhooks/lemonsqueezy` and
   used the environment's matching `LEMON_SQUEEZY_WEBHOOK_SECRET`.
3. Check `webhook_events` by `provider = 'lemon_squeezy'` and the derived event
   identity. A processed receipt means an exact retry should already have been
   acknowledged without new outbox work.
4. If no receipt exists, repair the fault first. A failed D1 batch does not
   leave a processed receipt, so Lemon can safely retry it.
5. In Lemon **Test mode** only, use the dashboard's webhook simulation/retry to
   send the event once. Never reconstruct or paste a production payload.
6. Confirm the expected purchase state plus one audit and outbox record. R3
   does not create entitlements; do not perform activation remediation here.
7. Record the sanitized cause and follow up with affected customers only when a
   later entitlement workflow shows access was affected.

Staging precedent (2026-09-07): an `order_created` resend was acknowledged
without a second purchase, audit event, or outbox job; a subsequent
`order_refunded` transitioned the one purchase to `refunded` and created its
own single audit and outbox records. No raw payload was queried or recorded.
