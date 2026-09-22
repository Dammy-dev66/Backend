# Make Email Mapping: Finbar B. Elite Tutoring

The booking backend now posts the following fields to the existing Make receipt webhook.

## Customer email module

- **To:** `to`
- **Subject:** `subject`
- **HTML body:** `html`
- **Sender display name:** `fromName` (`Finbar B. Elite Tutoring`)
- **Reply-to:** `replyTo` (`hello@finbarb.com`)

Do not place `studentName` or `studentName2` in this email.

## Finbar internal notification module

- **To:** `copyTo`
- **Subject:** `subject`
- **HTML body:** `finHtml`
- **Sender display name:** `fromName`
- **Reply-to:** `replyTo`

`finHtml` includes the parent/guardian name, contact details, Student 1, Student 2 where supplied, package code, course, format, and price.

## Sender identity

The visible sender should be configured in the connected email account as:

`Finbar B. Elite Tutoring`

The underlying mailbox must be a verified address that the connected email provider permits Make to send from. The backend can supply a display name and reply-to address, but it cannot override the provider's verified sending identity.
