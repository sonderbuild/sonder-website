# ADR 001: Lemon Squeezy owns commerce

**Status:** accepted

Lemon Squeezy is the merchant-of-record and the source for orders, refunds,
subscriptions, invoices, and generated license keys. sonder verifies its signed
webhooks and derives product access locally. A checkout redirect is never proof
of ownership.

This avoids building payment, tax, and invoice systems while preserving a
vendor-independent entitlement and activation layer.
