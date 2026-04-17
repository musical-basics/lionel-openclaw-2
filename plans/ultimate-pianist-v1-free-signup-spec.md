# Ultimate Pianist V1 Free Signup Flow

Updated: 2026-04-17
Scope: free waitlist signup only, v1 only

## Goal

Let a visitor submit name and email to join the free waitlist.
This flow creates or refreshes exactly one `up_waitlist_entries` row per normalized email and never grants VIP status.

## Page and form behavior

- Show a simple free-signup form on the landing page.
- Fields:
  - `name`
  - `email`
- Hidden or server-provided field:
  - `source = 'landing_page_free'`
- Primary button label:
  - `Join Free Waitlist`
- On submit:
  - disable the submit button
  - prevent double-submits while the request is in flight
  - optionally show a loading label like `Joining...`
- V1 does not require a redirect after submit.
- V1 does not send a confirmation email for free signup.

## Validation rules

Client-side:
- `name` required after trim
- `email` required after trim
- use normal HTML email validation plus simple client validation

Server-side is authoritative:
- `name = trim(name)`
- `email = trim(email)`
- `email_normalized = lower(trim(email))`
- `name` must be 1 to 100 characters after trim
- `email` must be 3 to 254 characters after trim
- reject blank values
- reject invalid email format
- do not trust client-provided normalization

## Submit action

Use a server-side route, not a direct browser write to Supabase.

Recommended endpoint:
- `POST /api/waitlist/free`

Request body:
```json
{
  "name": "Lionel Yu",
  "email": "lionel@example.com",
  "source": "landing_page_free"
}
```

Recommended response contract:
- `200 { "ok": true }` for both new signups and duplicate signups
- `400 { "ok": false, "error": "invalid_input" }` for validation failure
- `500 { "ok": false, "error": "server_error" }` for unexpected failure

Important v1 rule:
- the public success response should be the same for both brand-new and duplicate submissions
- this keeps the flow idempotent and avoids obvious email-enumeration behavior in the UI

## DB write behavior

Table:
- `public.up_waitlist_entries`

Key rule:
- one row per `email_normalized`

Write logic:
1. Normalize input on the server.
2. Attempt an upsert on `email_normalized`.
3. If the row does not exist, insert:
   - `email`
   - `email_normalized`
   - `name`
   - `source`
   - `waitlist_tier = 'free'`
   - `payment_status = 'none'`
   - `pdf_fulfillment_status = 'not_applicable'`
4. If the row already exists, update only:
   - `name`
   - `source`
   - `updated_at`
5. Never change these fields from the free-signup endpoint:
   - `waitlist_tier`
   - `payment_status`
   - `pdf_fulfillment_status`
   - `stripe_customer_id`
   - `stripe_checkout_session_id`
   - `stripe_payment_intent_id`
   - `vip_paid_at`
   - `pdf_sent_at`
   - `pdf_last_attempt_at`
   - `pdf_last_error`
   - `pdf_fulfillment_attempt_count`

Implementation note:
- if an email already belongs to a VIP or pending-checkout row, free signup must only refresh `name` and `source`; it must not downgrade or reset anything

## Success state

On any successful `200` response:
- replace the form with a simple success state
- success copy should be generic and identical for both new and duplicate submissions

Recommended copy:
- headline: `You're on the waitlist.`
- body: `We’ll let you know when Ultimate Pianist is ready.`

V1 success-state rules:
- no redirect required
- no confirmation email required
- do not reveal whether the email was brand new, already free, pending VIP, or already VIP

## Duplicate signup behavior

If the same normalized email is submitted again:
- do not create a second row
- treat the request as a successful idempotent submit
- update `name`, `source`, and `updated_at`
- return the same `200 { "ok": true }`
- show the same success state

This applies to:
- duplicate free signup on an existing free row
- free signup on an existing pending VIP checkout row
- free signup on an existing VIP-paid row

In all three cases, the free flow must not downgrade or overwrite payment or fulfillment state.

## Failure state

Validation failure:
- do not submit to the database
- show inline field errors
- keep the user’s typed values in the form
- re-enable the submit button

Server or network failure:
- show a generic error state under the form
- keep the typed values in the form
- re-enable the submit button
- allow immediate retry

Recommended generic error copy:
- `Something went wrong. Please try again.`

V1 failure-state rule:
- do not expose raw database or server errors in the UI

## Non-goals for this step

Out of scope for Step 3:
- VIP checkout flow
- Stripe
- PDF fulfillment
- authenticated accounts
- analytics dashboard behavior beyond storing `source`
- email confirmation or double opt-in
