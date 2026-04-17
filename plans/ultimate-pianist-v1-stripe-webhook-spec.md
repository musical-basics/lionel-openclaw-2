# Ultimate Pianist V1 Stripe Webhook and VIP Payment Confirmation

Updated: 2026-04-17
Scope: Stripe webhook intake and VIP payment confirmation only, v1 only

## Goal

Accept verified Stripe webhook events for the $1 VIP waitlist flow.
In v1, the webhook is the only path that grants VIP status.
A successful webhook confirmation updates the matching `up_waitlist_entries` row to VIP-paid and transitions PDF fulfillment to `pending`.

## Endpoint and event intake

Recommended endpoint:
- `POST /api/stripe/webhook`

Request requirements:
- accept the raw request body exactly as Stripe sent it
- read the `Stripe-Signature` header
- do not run normal JSON parsing before signature verification
- this endpoint is server-to-server only, not browser-facing

Recommended webhook response behavior:
- return `200` when a verified event is applied, ignored, or is a duplicate of an already-finalized `applied` or `ignored` event
- return `400` when signature verification fails or the payload is malformed
- return `500` when a verified event cannot be fully applied and should be retried by Stripe, including verified-but-apply-failed events after the webhook row has already been recorded

Important v1 rule:
- do not perform direct VIP grant logic from the success page or client-side redirect
- VIP grant happens only inside this verified webhook flow

## Signature verification

Server-owned config:
- Stripe webhook signing secret for this endpoint

Verification rules:
1. Read the raw request body.
2. Read the `Stripe-Signature` header.
3. Call Stripe's signature verifier with the raw body, signature header, and webhook secret.
4. If verification fails, return `400` immediately.
5. Do not write to `up_waitlist_entries` if the event is not verified.

Recommended implementation note:
- in Next.js, keep access to the raw body, for example via `await request.text()`, before calling Stripe's webhook verification helper

## Event types handled in v1

State-changing success event:
- `checkout.session.completed`

Success event must also satisfy all of these:
- `mode = 'payment'`
- `payment_status = 'paid'`
- `metadata.flow = 'ultimate_pianist_v1_vip_waitlist'`

Ignored or audit-only events in v1:
- `checkout.session.expired`
- `payment_intent.payment_failed`
- any Stripe event type outside this VIP waitlist flow
- any Stripe event that is verified but does not satisfy the success rules above

Important v1 rule:
- only the verified paid `checkout.session.completed` event grants VIP and transitions fulfillment to `pending`

## Normalized fields to extract after verification

From the verified Stripe event, extract when present:
- `stripe_event_id`
- `stripe_event_type`
- `stripe_event_created_at`
- `stripe_checkout_session_id`
- `stripe_payment_intent_id`
- `stripe_customer_id`
- `checkout_email`
- `email_normalized = lower(trim(checkout_email))`
- `checkout_name` if non-blank
- `source = metadata.source` if present
- full verified payload as JSON

Email extraction rule for `checkout.session.completed`:
- use `customer_details.email` first when present
- otherwise use `customer_email`
- if neither exists and no row can be found by `stripe_checkout_session_id`, mark the webhook event as `failed` because v1 cannot safely locate or create the waitlist row

## Idempotency and webhook audit

Table:
- `public.up_stripe_webhook_events`

Primary idempotency rule:
- `stripe_event_id` is unique

Processing rule:
1. Verify the Stripe signature first.
2. Attempt to insert a webhook-event row with:
   - `stripe_event_id`
   - `stripe_event_type`
   - `stripe_checkout_session_id`
   - `stripe_payment_intent_id`
   - `email_normalized`
   - `payload`
   - `processing_status = 'received'`
3. Use `on conflict (stripe_event_id) do nothing`.
4. If the insert affects 0 rows, load the existing webhook row by `stripe_event_id` and branch by its current status.
5. If the existing row is already `applied` or `ignored`, return `200` and stop.
6. If the existing row is `failed`, treat this delivery as a retry and attempt the normal apply path again using the same `stripe_event_id`.
7. If the existing row is still `received`, do not create a second worker path for the same event; return `200` and let the in-flight attempt finish.
8. From this point forward, finalize that webhook row as one of:
   - `applied`
   - `ignored`
   - `failed`

Secondary idempotency guards:
- `up_waitlist_entries.stripe_checkout_session_id` is unique when present
- `up_waitlist_entries.stripe_payment_intent_id` is unique when present
- if the target waitlist row is already `payment_status = 'paid'` with the same `stripe_payment_intent_id` or same `stripe_checkout_session_id`, mark the webhook event as `ignored`, set `processed_at = now()`, and stop

## Row lookup and creation rules

Apply these rules only for the verified paid `checkout.session.completed` event.

Lookup order:
1. exact match by `stripe_checkout_session_id`
2. fallback exact match by `email_normalized`

Creation rule:
- if no row is found after both lookups, create a new row using the successful checkout email as the canonical email for that VIP record

Expected v1 consequence:
- this automatic create path can produce parallel rows for one human if they used different emails across free signup and VIP checkout
- that is expected in v1 and is left for manual admin merge outside the automated flow

Source rule on newly created rows:
- use verified `metadata.source` if present
- otherwise use `source = 'stripe_webhook_vip'`

No-merge rule:
- do not fuzzy-match emails
- do not merge two existing rows automatically
- if the webhook email does not exactly match an existing row and there is no `stripe_checkout_session_id` match, create a new VIP row instead of merging identities

Canonical-email rule:
- if the webhook creates a brand-new row, set `email` and `email_normalized` from the successful checkout email
- if the webhook updates an existing row, do not rewrite that row's canonical email in v1

Name rule:
- if the verified webhook includes a non-blank `checkout_name`, update `name`
- otherwise keep the existing `name` value

## Payment success handling

Success path trigger:
- verified `checkout.session.completed`
- `mode = 'payment'`
- `payment_status = 'paid'`
- `metadata.flow = 'ultimate_pianist_v1_vip_waitlist'`

Success write behavior:
1. Find or create the target waitlist row using the rules above.
2. Update that row to:
   - `waitlist_tier = 'vip'`
   - `payment_status = 'paid'`
   - `pdf_fulfillment_status = 'pending'`
   - `stripe_checkout_session_id = ...`
   - `stripe_payment_intent_id = ...`
   - `stripe_customer_id = ...` if present
   - `vip_paid_at = stripe_event_created_at`
   - `name = checkout_name` only if non-blank
3. If this is a newly created row, also set:
   - `email`
   - `email_normalized`
   - `source`
4. Do not change on success:
   - `pdf_sent_at`
   - `pdf_last_attempt_at`
   - `pdf_last_error`
   - `pdf_fulfillment_attempt_count`
5. Update the webhook-event row to:
   - `waitlist_entry_id = target row id`
   - `processing_status = 'applied'`
   - `processed_at = now()`
   - `error_message = null`

Resulting state:
- the user is VIP-paid
- PDF fulfillment is queued as pending
- no email delivery is attempted synchronously in this step

Timestamp note:
- in v1, `vip_paid_at` stores the Stripe event timestamp, not local webhook processing time

## Payment failure and ignored-event handling

Ignored-event rule for v1:
- if a verified event is not the paid `checkout.session.completed` event for `ultimate_pianist_v1_vip_waitlist`, record it and finalize it as `ignored`

This includes:
- `checkout.session.expired`
- `payment_intent.payment_failed`
- unrelated Stripe events
- verified `checkout.session.completed` events that are not actually `payment_status = 'paid'`

Ignored-event behavior:
- do not grant VIP
- do not set `pdf_fulfillment_status = 'pending'`
- do not send the PDF
- do not mutate `waitlist_tier`, `source`, or fulfillment fields on the main waitlist row
- optionally attach `waitlist_entry_id` on the webhook-event row if a clean lookup is available, for audit only
- set `processing_status = 'ignored'`
- set `processed_at = now()`
- keep `error_message = null`

Failed-webhook rule:
- if a verified event cannot be safely applied because required success data is missing, or because the success row update cannot be completed after the webhook-event row was created, mark that webhook-event row as `failed`
- set `processed_at = now()`
- set `error_message` to a short internal reason
- do not grant VIP
- do not queue PDF fulfillment

Explicit retry policy for v1:
- if initial verified-event persistence itself fails, return `500` so Stripe retries later
- if the verified webhook-event row was recorded but apply logic fails afterward, keep that row as `failed` and return `500` so Stripe retries the same event
- on a later delivery of the same `stripe_event_id`, do not treat an existing `failed` row as a completed duplicate; retry the apply path
- once the event is later applied successfully, or deterministically classified as ignored, finalize it as `applied` or `ignored` and return `200`

Important v1 simplification:
- non-success webhook events do not attempt to repair or downgrade pending checkout rows
- stale or expired pending-checkout cleanup is handled by the Step 4 checkout-start rules when the visitor tries again

## Transition to PDF fulfillment pending

The webhook's fulfillment responsibility in Step 5 is only this transition:
- on successful VIP payment confirmation, set `pdf_fulfillment_status = 'pending'`

Do not do these inside the webhook handler in v1:
- do not call the DreamPlay Email API synchronously before returning
- do not wait for the PDF to send before marking payment applied
- do not block Stripe's webhook response on PDF delivery

Hand-off rule:
- Step 5 ends when the waitlist row is VIP-paid and `pdf_fulfillment_status = 'pending'`
- the actual PDF send and retry behavior belong to the next step

## Non-goals for this step

Out of scope for Step 5:
- checkout-session creation
- success-page or cancel-page UI behavior
- PDF sending and retry logic
- refunds and chargebacks
- admin replay tooling for failed webhook rows
- broader Stripe event handling outside the v1 VIP waitlist flow
