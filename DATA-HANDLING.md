# Data handling summary

This is an operational summary, not a privacy notice or legal advice. Review the
localized policy templates with qualified local counsel before launch.

## Data stored

- **Accounts:** normalized email, optional name, password hash, role, preferred
  language, email-verification state, and the accepted Terms/Privacy version and
  timestamp.
- **Authentication:** hashed refresh tokens, hashed one-time email tokens,
  token expiry/use timestamps, and limited session metadata (IP address and
  user-agent) for security. Raw passwords and tokens are not stored in the
  database.
- **Listings and operations:** property content, media metadata, administrative
  audit actions, and anonymous inquiry/click counts used by staff reporting.
- **Cookie preferences:** essential authentication/security cookies and an
  optional analytics/marketing choice stored in a first-party cookie for up to
  12 months. Optional categories remain disabled unless selected. No analytics
  or marketing provider is currently loaded by the site.
- **Email delivery:** queued verification/reset messages contain the recipient,
  localized copy, and a one-time action URL until delivery. BullMQ retries
  failures up to five times with exponential backoff, then removes completed or
  exhausted jobs.

## Retention and deletion

- Verification links expire after 24 hours; password-reset links expire after
  30 minutes. Expired email tokens are purged daily. Replaced tokens are marked
  used immediately.
- Refresh sessions expire within the configured maximum of 30 days and are
  revoked on password reset/change or account deletion.
- Account deletion anonymizes the account, removes favorites, revokes sessions,
  and invalidates outstanding email tokens. A sole active administrator cannot
  self-delete; transfer administrator access first.
- PostgreSQL backups are locally pruned after 30 days by the backup script.
  Protect backups with encrypted persistent storage and independent off-site
  retention according to the operator's approved policy.
- Operational logs and email-provider delivery records must be retained only
  for the minimum period required for security, troubleshooting, and applicable
  legal obligations. Never log passwords, tokens, full action URLs, or message
  bodies.

## User requests and operator duties

Users can change their preferred language, request an email-address change
(verified at the new address), change their password, and request account
deletion in Account settings. Configure `RESEND_API_KEY`, `EMAIL_FROM`, and
`WEB_BASE_URL` for delivery. Set the optional `BROKER_LICENSE_NUMBER` value to
show the broker registration slot in the footer.

Before production, the operator must confirm legal basis, cookie categories,
retention periods, contact details, and local data-subject request procedures.
The Privacy, Terms, and Cookie pages intentionally identify their text as a
template requiring owner/legal review.
