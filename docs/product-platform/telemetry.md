# Telemetry and error monitoring

## Responsibilities

| System | Answers | Must not contain |
| --- | --- | --- |
| Sentry | What failed, in which product version, and how often? | License keys, access tokens, Discogs credentials, support content, or customer email. |
| TelemetryDeck | Which aggregate product behaviour is useful? | A customer profile, raw identifiers, purchase history, or sensitive content. |
| Cloudflare Workers Logs | What happened during an API request? | Secrets, raw webhook bodies, raw license keys, or customer message content. |

Define every event before it is emitted: name, product, purpose, fields, owner,
retention, and whether consent is required. Review Sentry's client and server
scrubbing rules before its production key is introduced.

## Release correlation

Tag Sentry events with product, customer-visible version, build number, and
release channel. Do not use email or license values as tags. A support case may
reference a Sentry event ID only after confirming it contains no customer data.
