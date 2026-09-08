# Rollback

1. Stop the release or route traffic to the last known-good deployment.
2. Identify whether data migration, entitlement policy, webhook processing, or
   client release caused the impact.
3. Do not reverse a data migration without a tested restoration plan.
4. Verify health, customer access, and error rate after rollback.
5. Record the incident, owner, customer impact, and follow-up before retrying.
