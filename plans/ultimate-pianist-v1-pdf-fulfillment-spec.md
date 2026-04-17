# Ultimate Pianist V1 PDF Fulfillment Flow

Updated: 2026-04-17
Scope: VIP PDF fulfillment only, v1 only

## Goal

Deliver the Easy Moonlight Sonata Nightmare PDF by email after a row has already been confirmed as VIP-paid.
In v1, fulfillment begins only after Step 5 has set `pdf_fulfillment_status = 'pending'`.
PDF delivery never changes VIP grant state. A fulfillment failure does not revoke VIP.

## Trigger point and eligibility

The fulfillment trigger is row state, not browser state.
A row becomes eligible for PDF fulfillment when all of these are true:
- `waitlist_tier = 'vip'`
- `payment_status = 'paid'`
- `pdf_fulfillment_status = 'pending'`

Recommended v1 runner:
- use a server-side fulfillment worker, not a browser action
- recommended internal entrypoint: `POST /api/internal/ultimate-pianist/fulfill-pdf`
- invoke it from a scheduled server-side job on a reasonable recurring cadence
- allow the same worker to be called for manual admin retry of one specific row

Recommended internal request contract:
```json
{
  "waitlistEntryId": "6c2c7fd8-1234-4a63-9d47-111111111111"
}
```

Rules:
- if `waitlistEntryId` is provided, process only that row
- if `waitlistEntryId` is omitted, select the next eligible pending row or small batch of eligible pending rows
- this worker is server-side only and must not be callable by public browsers

Recommended row selection for scheduled runs:
- filter to rows where `waitlist_tier = 'vip'`, `payment_status = 'paid'`, and `pdf_fulfillment_status = 'pending'`
- prefer older pending rows first
- avoid immediate tight reprocessing of rows that were just attempted

## Concurrency and duplicate-send protection

Important v1 rule:
- only one fulfillment worker may process a given `waitlist_entry_id` at a time

Recommended implementation:
- acquire a row lock or equivalent server-side mutex before sending
- re-read the row after the lock is acquired
- if the row is no longer eligible, exit without sending

Important v1 protection:
- use a stable provider idempotency key per waitlist row so repeated deliveries of the same fulfillment intent do not create duplicate emails if a crash happens after provider acceptance

Recommended idempotency key:
- `ultimate_pianist_v1_pdf:${waitlist_entry_id}`

## Server-owned fulfillment inputs

Do not trust any client-supplied email-template or attachment data.
These values are owned by the server:
- DreamPlay Email API base URL and auth secret
- sender identity
- email subject
- email body or template id
- the Easy Moonlight Sonata Nightmare PDF asset
- attachment filename
- idempotency key format

Recommended server-owned PDF asset:
- one canonical PDF file for v1
- stored in a server-controlled location, for example Supabase Storage or another private server-owned asset path
- never selected by the browser

Recommended attachment filename:
- `Easy-Moonlight-Sonata-Nightmare.pdf`

Recommended subject:
- `Your Easy Moonlight Sonata Nightmare PDF`

## DreamPlay Email API request contract

Recommended v1 request body:
```json
{
  "template": "ultimate_pianist_v1_vip_pdf",
  "idempotencyKey": "ultimate_pianist_v1_pdf:6c2c7fd8-1234-4a63-9d47-111111111111",
  "to": {
    "email": "lionel@example.com",
    "name": "Lionel Yu"
  },
  "subject": "Your Easy Moonlight Sonata Nightmare PDF",
  "metadata": {
    "project": "ultimate_pianist",
    "flow": "vip_pdf_fulfillment_v1",
    "waitlistEntryId": "6c2c7fd8-1234-4a63-9d47-111111111111",
    "emailNormalized": "lionel@example.com",
    "stripeCheckoutSessionId": "cs_test_123",
    "stripePaymentIntentId": "pi_123"
  },
  "attachments": [
    {
      "filename": "Easy-Moonlight-Sonata-Nightmare.pdf",
      "contentType": "application/pdf",
      "contentBase64": "<base64-pdf-bytes>"
    }
  ]
}
```

Request rules:
- `to.email` comes from the canonical `up_waitlist_entries.email`
- `to.name` uses `name` when present, otherwise omit it or send null
- `contentBase64` is built on the server from the canonical PDF asset
- `metadata` is for auditability and support, not user-visible rendering
- use the stable idempotency key for every retry of the same row

Recommended success interpretation:
- treat a normal accepted success response from DreamPlay Email API as fulfilled for v1
- if the provider returns a message id, log it for troubleshooting even though v1 does not store it in `up_waitlist_entries`

Recommended failure interpretation:
- treat transient provider or network problems as retryable failure
- treat missing recipient email, missing PDF asset, malformed request, or hard provider validation rejection as terminal failure

## Fulfillment processing flow

For each eligible row:
1. Lock the row or acquire a per-row mutex.
2. Re-read and confirm the row is still:
   - `waitlist_tier = 'vip'`
   - `payment_status = 'paid'`
   - `pdf_fulfillment_status = 'pending'`
3. Build the DreamPlay Email API request from server-owned data.
4. Send the email request with the stable idempotency key.
5. Classify the result as success, retryable failure, or terminal failure.
6. Write the resulting state back to `up_waitlist_entries`.

If the row is already `pdf_fulfillment_status = 'sent'` when the worker acquires the lock:
- do nothing
- do not send a second email

If the row is no longer VIP-paid when the worker acquires the lock:
- do nothing
- do not send the PDF
- leave fulfillment state unchanged unless a human intentionally changed it earlier

## Success writes

On accepted provider success, update only:
- `pdf_fulfillment_status = 'sent'`
- `pdf_sent_at = now()`
- `pdf_last_attempt_at = now()`
- `pdf_last_error = null`
- `pdf_fulfillment_attempt_count = pdf_fulfillment_attempt_count + 1`

Do not change on fulfillment success:
- `waitlist_tier`
- `payment_status`
- `vip_paid_at`
- `source`
- Stripe ids

Resulting state:
- the row stays VIP-paid
- fulfillment is complete
- admin can see that the PDF was sent

## Retryable failure writes

Retryable failures include:
- DreamPlay Email API timeout
- network failure before a definitive response
- temporary provider unavailability
- other transient delivery infrastructure problems

On retryable failure, update:
- `pdf_fulfillment_status = 'pending'`
- `pdf_last_attempt_at = now()`
- `pdf_last_error = short internal failure summary`
- `pdf_fulfillment_attempt_count = pdf_fulfillment_attempt_count + 1`

Do not change:
- `pdf_sent_at`
- `waitlist_tier`
- `payment_status`
- `vip_paid_at`

## Terminal failure writes

Terminal failures include:
- missing or blank canonical email on the row
- missing server-owned PDF asset
- malformed request built by the app
- hard provider validation or rejection response

On terminal failure, update:
- `pdf_fulfillment_status = 'failed'`
- `pdf_last_attempt_at = now()`
- `pdf_last_error = short internal failure summary`
- `pdf_fulfillment_attempt_count = pdf_fulfillment_attempt_count + 1`

Do not change:
- `pdf_sent_at`
- `waitlist_tier`
- `payment_status`
- `vip_paid_at`

Resulting state:
- the row stays VIP-paid
- fulfillment stops automatic retry and now needs admin attention

## Retry behavior

Recommended v1 retry policy:
- allow automatic retry only for rows still in `pdf_fulfillment_status = 'pending'`
- do not auto-retry rows already marked `failed`
- use the same stable provider idempotency key on every retry for the same row
- allow a small number of spaced automatic retries for transient failures before promoting the row to `failed`

Operational rule:
- the scheduler should avoid tight retry loops and skip rows that were just attempted

Reason for this v1 policy:
- it gives a few automatic retries for transient provider issues
- it avoids noisy or duplicate sending behavior
- it pushes longer-running problems into an explicit admin queue instead of hiding them forever

## Manual retry and admin expectations

Admin must be able to identify and retry fulfillment problems without changing VIP payment state.

Recommended admin expectations for v1:
- admin list shows `payment_status`, `pdf_fulfillment_status`, `pdf_sent_at`, `pdf_last_attempt_at`, `pdf_last_error`, and `pdf_fulfillment_attempt_count`
- admin can filter rows where `pdf_fulfillment_status in ('pending', 'failed')`
- admin can manually retry any row that is:
  - `waitlist_tier = 'vip'`
  - `payment_status = 'paid'`
  - `pdf_fulfillment_status = 'pending'` or `pdf_fulfillment_status = 'failed'`

Recommended manual retry behavior:
- if the row is `failed`, set `pdf_fulfillment_status = 'pending'` and keep existing audit fields until the new attempt finishes
- invoke the same fulfillment worker for that specific `waitlistEntryId`
- do not reset `pdf_fulfillment_attempt_count`
- do not change `waitlist_tier`, `payment_status`, or `vip_paid_at`

Recommended stuck-pending rule:
- if a row stays `pending` for an unexpectedly long time, treat it as operationally stuck and surface it in admin filters
- admin retry is allowed for these stuck pending rows

## User-visible assumptions

Important v1 assumption:
- the browser is not the source of truth for PDF delivery
- the server-side fulfillment state is the source of truth

Recommended user-visible promise after payment confirmation:
- `Your payment is confirmed. Your PDF will be emailed shortly.`

User-visible rules for v1:
- do not claim the PDF is already sent unless server-side state confirms `pdf_fulfillment_status = 'sent'`
- do not block payment confirmation UI on actual email delivery
- do not revoke VIP if email fulfillment fails
- do not promise live delivery tracking in the UI
- do not promise a public resend button in v1
- support or admin may need to resend manually if fulfillment fails

## Non-goals for this step

Out of scope for Step 6:
- building the full admin UI itself
- public self-serve resend links
- SMS or alternate delivery channels
- a dedicated PDF-attempt history table
- refund handling
- course access rules beyond the already-confirmed VIP payment state
