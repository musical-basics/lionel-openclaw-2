# Ultimate Pianist V1 VIP Checkout Flow

Updated: 2026-04-17
Scope: $1 VIP checkout start flow only, v1 only

## Goal

Let a visitor start the $1 VIP checkout flow from the landing page.
This flow creates or reuses a Stripe Checkout Session, records checkout intent in `up_waitlist_entries`, and redirects the visitor to Stripe.
It does not grant VIP status directly. VIP is granted only after the Stripe webhook confirms successful payment.

## CTA behavior

- Show a VIP CTA on the landing page alongside the free waitlist path.
- Required visible fields before starting checkout:
  - `name`
  - `email`
- Hidden or server-provided field:
  - `source = 'landing_page_vip'`
- Primary VIP CTA label:
  - `Get VIP for $1`
- On click:
  - validate the form first
  - disable the VIP CTA while the request is in flight
  - prevent double-submits
  - optionally show a loading label like `Redirecting...`
- On successful session creation:
  - redirect the browser to the returned Stripe Checkout URL
- V1 does not send any email at checkout start.
- V1 does not mark the user as VIP at checkout start.

## Required request fields

Use a server-side route, not a direct browser call to Stripe.

Recommended endpoint:
- `POST /api/waitlist/vip/checkout`

Required request body:
```json
{
  "name": "Lionel Yu",
  "email": "lionel@example.com",
  "source": "landing_page_vip"
}
```

Server-side rules:
- `name = trim(name)`
- `email = trim(email)`
- `email_normalized = lower(trim(email))`
- `name` must be 1 to 100 characters after trim
- `email` must be 3 to 254 characters after trim
- reject blank values
- reject invalid email format
- do not trust client-provided normalization
- do not trust client-provided Stripe price ids or return URLs

Server-owned config:
- Stripe price id for the $1 VIP offer
- success URL
- cancel URL

Recommended response contract:
- `200 { "ok": true, "status": "checkout_created", "checkoutUrl": "https://checkout.stripe.com/..." }`
- `200 { "ok": true, "status": "checkout_reused", "checkoutUrl": "https://checkout.stripe.com/..." }`
- `200 { "ok": true, "status": "already_vip" }`
- `400 { "ok": false, "error": "invalid_input" }`
- `429 { "ok": false, "error": "rate_limited" }`
- `500 { "ok": false, "error": "server_error" }`

## Checkout session creation

Create the Stripe Checkout Session on the server.

Recommended Stripe fields:
- `mode = 'payment'`
- one line item using the server-owned $1 VIP price id
- `customer_email = email`
- `success_url = ${origin}/vip/success?session_id={CHECKOUT_SESSION_ID}`
- `cancel_url = ${origin}/vip/cancel`
- `client_reference_id = email_normalized`
- `metadata.flow = 'ultimate_pianist_v1_vip_waitlist'`
- `metadata.email_normalized = email_normalized`
- `metadata.source = source`

Important v1 rule:
- do not return `checkoutUrl` to the browser unless the corresponding pending checkout state has been written successfully to the database

## DB updates at checkout start

Table:
- `public.up_waitlist_entries`

Key rules:
- one row per `email_normalized`
- `waitlist_tier` remains granted state, so it stays `free` until payment success is confirmed by webhook
- `source` remains first-touch, not last-touch

Write logic:
1. Normalize input on the server.
2. Look up `up_waitlist_entries` by `email_normalized`.
3. If an existing row is already `waitlist_tier = 'vip'` and `payment_status = 'paid'`, do not create a new Checkout Session.
4. Otherwise create or reuse a Checkout Session.
5. After a usable Checkout Session exists, write the pending checkout state.

If no row exists, insert:
- `email`
- `email_normalized`
- `name`
- `source`
- `waitlist_tier = 'free'`
- `payment_status = 'pending'`
- `pdf_fulfillment_status = 'not_applicable'`
- `stripe_customer_id`
- `stripe_checkout_session_id`
- `vip_checkout_started_at = now()`

If a non-paid row already exists, update only:
- `name`
- `updated_at`
- `payment_status = 'pending'`
- `stripe_customer_id`
- `stripe_checkout_session_id`
- `vip_checkout_started_at = now()`

Exact selective-update rule on existing rows:
- do update `name`
- do update `updated_at`
- do update `payment_status` to `pending`
- do update `stripe_customer_id`
- do update `stripe_checkout_session_id`
- do update `vip_checkout_started_at`
- do not update `source`
- do not update `waitlist_tier`
- do not update `pdf_fulfillment_status`
- do not update `stripe_payment_intent_id`
- do not update `vip_paid_at`
- do not update any PDF fulfillment fields

## Success and cancel return behavior

Success return:
- Stripe returns the visitor to `/vip/success?session_id={CHECKOUT_SESSION_ID}`
- the success page is confirmation-only
- it should say payment completed and the PDF is being emailed shortly
- it must not assume PDF delivery already finished
- it must not rely on client-side state to grant VIP access

Recommended success copy:
- headline: `You're in VIP.`
- body: `Your payment went through. We’re emailing your PDF shortly.`

Cancel return:
- Stripe returns the visitor to `/vip/cancel`
- show a neutral cancel state
- let the visitor try again immediately
- do not downgrade or delete the pending row on cancel return

Recommended cancel copy:
- headline: `Checkout canceled.`
- body: `No problem. You can try the VIP checkout again anytime.`

## Duplicate and already-VIP behavior

Already VIP:
- if the row already has `waitlist_tier = 'vip'` and `payment_status = 'paid'`, do not create a new Checkout Session
- return `200 { "ok": true, "status": "already_vip" }`
- show a friendly already-VIP state instead of redirecting to Stripe

Recommended already-VIP copy:
- headline: `This email is already VIP.`
- body: `You already have the VIP waitlist access for this email.`

Pending checkout already exists:
- if the row has `payment_status = 'pending'` and the existing Stripe Checkout Session is still open, reuse it
- return `200 { "ok": true, "status": "checkout_reused", "checkoutUrl": existingSessionUrl }`
- do not create a second open Checkout Session for the same normalized email

Pending checkout exists but session is expired or unusable:
- create a fresh Checkout Session
- update `stripe_checkout_session_id` and `vip_checkout_started_at`
- keep `waitlist_tier = 'free'`

Existing free row:
- if the row exists as free, reuse the same row and move only `payment_status` to `pending`
- do not create a second row
- do not overwrite first-touch `source`

## Failure state

Validation failure:
- return `400 invalid_input`
- show inline field errors
- keep typed values in the form
- re-enable the VIP CTA

Rate limit failure:
- return `429 rate_limited`
- show a generic retry-later message
- re-enable the VIP CTA

Stripe session creation failure:
- return `500 server_error`
- do not redirect
- show a generic checkout error message
- re-enable the VIP CTA

Database write failure after session preparation:
- return `500 server_error`
- do not redirect
- show a generic checkout error message
- re-enable the VIP CTA
- log the failure for admin investigation

Recommended generic error copy:
- `Something went wrong starting checkout. Please try again.`

Recommended rate-limit copy:
- `Too many attempts. Please wait a moment and try again.`

V1 failure-state rule:
- do not expose raw Stripe, database, or server errors in the UI

## Minimal abuse / rate-limit note

- Add a basic IP-based rate limit to `POST /api/waitlist/vip/checkout`
- v1 recommendation: allow up to 5 requests per minute per IP
- return HTTP 429 on limit exceed
- do not add CAPTCHA in v1 unless real abuse appears

## Non-goals for this step

Out of scope for Step 4:
- webhook payment confirmation logic
- PDF fulfillment logic
- refunds
- authenticated course access
- admin dashboard behavior beyond creating the pending checkout state
