# Support and engineering handoff

## Flow

```text
support@sonder.build or account support form
  -> Resend inbound event
  -> verify raw webhook signature
  -> support case and acknowledgement
  -> classify
     -> question or billing: case only
     -> bug or feature: sanitized private GitHub issue
     -> security: restricted security procedure
```

Use `support@sonder.build` only after confirming its MX arrangement does not
break other needed mail. If normal mail is already hosted elsewhere, use a
dedicated receiving subdomain and publish the customer-facing address only after
the routing design is tested.

## Case first, issue second

Every valid message becomes a private `SupportCase` with a reference such as
`SON-184`. An issue is created only after it is actionable engineering work.
This prevents GitHub from becoming an unfiltered mailbox and lets billing,
account-access, and general questions stay in the support system.

The issue must contain a sanitized title, case reference, product/version,
macOS version, expected/actual behaviour, safe reproduction, and labels. It
must not contain the customer’s name, email address, raw message, receipt,
license key, auth token, or unreviewed attachment.

## GitHub structure

Use one `sonderbuild` organization and private product repositories. Add a
private `sonder-support` repository for support-originated engineering issues
when the first automation is built. A GitHub App gets `Issues: write` access
only to that repository. It uses short-lived installation tokens, never a
personal access token.

One GitHub Project, **Sonder Product**, can provide Inbox, Bugs, Feature
Requests, Planned, In Progress, Release, and Done views. Use a small label set:
`bug`, `feature`, `security`, `licensing`, `website`, `backend`, product labels,
and `priority:p0` through `priority:p3`.

## Triage

1. Acknowledge receipt without promising a delivery date.
2. Capture only necessary product, version, macOS, and safe reproduction data.
3. Detect duplicates and classify the case.
4. Link an actionable issue, then update the case on fix, release, decline, or
   request for more information.
5. Close only after the customer has an answer or an available release.

Sentry may suggest an existing crash issue, but it is not a ticketing system.
Link it to the single GitHub issue rather than creating duplicates.
