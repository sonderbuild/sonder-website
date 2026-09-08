# Compromised secret

1. Disable or revoke the exposed credential immediately.
2. Determine its scope, time window, and accessible systems without exposing it
   in chat, issues, or logs.
3. Rotate dependent credentials and redeploy affected environments.
4. Reconcile safe webhooks or data changes, notify as legally required, and
   document the incident and prevention work.

## Entitlement signing-key incident

1. Treat exposure of `ENTITLEMENT_SIGNING_PRIVATE_KEY_PKCS8` as ticket forgery
   risk. Retire its `kid` and replace the Cloudflare secret; do not expose the
   old or new value while investigating.
2. Publish the new public verification key with a new `kid`; apps trust only
   the active key and any explicitly retained non-compromised overlap key.
3. Deploy the staging or production Worker only for the affected environment,
   force online refresh where product policy permits, and revoke affected access
   if the compromise window requires it.
4. Record key ID, environment, exposure window, ticket lifetime implications,
   and remediation evidence without recording a private key.
