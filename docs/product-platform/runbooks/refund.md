# Refund or cancellation

1. Treat the verified Lemon webhook as the commercial state change.
2. Reconcile the related pending or retryable commerce outbox job. The worker
   must re-read the current D1 purchase projection rather than trusting the job
   payload; a late paid job after a refund must remain revoked.
3. For the current one-time model, a refunded purchase revokes an existing
   derived entitlement. Missing or non-grant variant policy never creates an
   active entitlement.
4. Confirm one `entitlement.revoked` audit event only when the entitlement
   actually changed. A replay against an already-revoked entitlement is a
   no-op.
5. If processing fails, retain only the sanitized failure category, leave the
   job retryable, and retry after repairing the fault. Do not paste customer,
   order, payload, or secret data into the failure record.
6. Ensure the next online validation returns the correct customer-visible state.
