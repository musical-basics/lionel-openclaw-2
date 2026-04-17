# Ultimate Pianist V1 Schema and State Transitions

Updated: 2026-04-17
Scope: V1 waitlist + $1 VIP funnel only

## Matching rule used in this schema

For v1, treat an email match as an exact match on:
- `email_normalized = lower(trim(email))`

That keeps the approved "exact match only" rule while preventing case and whitespace duplicates.

## Table 1: `up_waitlist_entries`

Purpose: one row per unique normalized email in the v1 funnel.

```sql
create table public.up_waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  email_normalized text not null,
  name text null,
  source text not null default 'website',

  waitlist_tier text not null default 'free'
    check (waitlist_tier in ('free', 'vip')),

  payment_status text not null default 'none'
    check (payment_status in ('none', 'pending', 'paid', 'failed', 'refunded')),

  pdf_fulfillment_status text not null default 'not_applicable'
    check (pdf_fulfillment_status in ('not_applicable', 'pending', 'sent', 'failed')),

  stripe_customer_id text null,
  stripe_checkout_session_id text null,
  stripe_payment_intent_id text null,

  vip_checkout_started_at timestamptz null,
  vip_paid_at timestamptz null,
  pdf_sent_at timestamptz null,
  pdf_last_attempt_at timestamptz null,
  pdf_last_error text null,
  pdf_fulfillment_attempt_count integer not null default 0
    check (pdf_fulfillment_attempt_count >= 0),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### Required vs nullable

Required:
- `id`
- `email`
- `email_normalized`
- `source`
- `waitlist_tier`
- `payment_status`
- `pdf_fulfillment_status`
- `pdf_fulfillment_attempt_count`
- `created_at`
- `updated_at`

Nullable:
- `name`
- `stripe_customer_id`
- `stripe_checkout_session_id`
- `stripe_payment_intent_id`
- `vip_checkout_started_at`
- `vip_paid_at`
- `pdf_sent_at`
- `pdf_last_attempt_at`
- `pdf_last_error`

Note:
- `name` is nullable in the database for v1 safety, but should be required in the frontend whenever possible.

### Constraints and indexes

```sql
create unique index up_waitlist_entries_email_normalized_uidx
  on public.up_waitlist_entries (email_normalized);

create unique index up_waitlist_entries_checkout_session_uidx
  on public.up_waitlist_entries (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

create unique index up_waitlist_entries_payment_intent_uidx
  on public.up_waitlist_entries (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

create index up_waitlist_entries_admin_filters_idx
  on public.up_waitlist_entries (waitlist_tier, payment_status, pdf_fulfillment_status, created_at desc);

create index up_waitlist_entries_created_at_idx
  on public.up_waitlist_entries (created_at desc);
```

### Update trigger

```sql
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger up_waitlist_entries_set_updated_at
before update on public.up_waitlist_entries
for each row
execute function public.set_updated_at();
```

## Table 2: `up_stripe_webhook_events`

Purpose: idempotent Stripe webhook processing and audit trail.

```sql
create table public.up_stripe_webhook_events (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text not null,
  stripe_event_type text not null,
  waitlist_entry_id uuid null references public.up_waitlist_entries(id) on delete set null,
  stripe_checkout_session_id text null,
  stripe_payment_intent_id text null,
  email_normalized text null,

  processing_status text not null default 'received'
    check (processing_status in ('received', 'applied', 'ignored', 'failed')),

  error_message text null,
  payload jsonb not null,
  processed_at timestamptz null,
  created_at timestamptz not null default now()
);
```

### Required vs nullable

Required:
- `id`
- `stripe_event_id`
- `stripe_event_type`
- `processing_status`
- `payload`
- `created_at`

Nullable:
- `waitlist_entry_id`
- `stripe_checkout_session_id`
- `stripe_payment_intent_id`
- `email_normalized`
- `error_message`
- `processed_at`

### Constraints and indexes

```sql
create unique index up_stripe_webhook_events_event_uidx
  on public.up_stripe_webhook_events (stripe_event_id);

create index up_stripe_webhook_events_checkout_session_idx
  on public.up_stripe_webhook_events (stripe_checkout_session_id);

create index up_stripe_webhook_events_payment_intent_idx
  on public.up_stripe_webhook_events (stripe_payment_intent_id);

create index up_stripe_webhook_events_created_at_idx
  on public.up_stripe_webhook_events (created_at desc);
```

## State transitions

## 1. Free signup

Input:
- name
- email
- source

Process:
1. Compute `email_normalized = lower(trim(email))`.
2. Look up `up_waitlist_entries` by `email_normalized`.
3. If no row exists, insert:
   - `waitlist_tier = 'free'`
   - `payment_status = 'none'`
   - `pdf_fulfillment_status = 'not_applicable'`
4. If a free row already exists, update `name`, `source`, and `updated_at` only.
5. If a VIP-paid row already exists, update `name`, `source`, and `updated_at` only. Do not downgrade anything.

Resulting state:
- new or existing row remains the single canonical record for that normalized email

## 2. VIP checkout start

Input:
- name if available
- email
- source
- Stripe checkout session id
- Stripe customer id if created at checkout start

Process:
1. Compute `email_normalized = lower(trim(email))`.
2. Look up `up_waitlist_entries` by `email_normalized`.
3. If a row exists and `waitlist_tier = 'vip'` and `payment_status = 'paid'`, do not create a new VIP checkout session for v1. Return the existing VIP state.
4. If a non-paid row exists, update it with:
   - `stripe_checkout_session_id`
   - `stripe_customer_id`
   - `vip_checkout_started_at = now()`
   - `payment_status = 'pending'`
5. If no row exists, insert a new row with:
   - `waitlist_tier = 'free'`
   - `payment_status = 'pending'`
   - `pdf_fulfillment_status = 'not_applicable'`
   - `stripe_checkout_session_id`
   - `stripe_customer_id`
   - `vip_checkout_started_at = now()`

Resulting state:
- checkout intent exists
- no one becomes VIP until Stripe payment success is confirmed

## 3. VIP payment success

Input:
- Stripe event id
- Stripe checkout session id
- Stripe payment intent id
- checkout email
- optional name from Stripe
- raw Stripe payload

Process:
1. Insert a row into `up_stripe_webhook_events` with `processing_status = 'received'`.
2. If `stripe_event_id` already exists, stop processing and return success to Stripe. This is the first idempotency guard.
3. Find the target waitlist row in this order:
   - by `stripe_checkout_session_id`
   - fallback by `email_normalized`
4. If no row exists, create one using the checkout email as canonical.
5. Update the target row to:
   - `waitlist_tier = 'vip'`
   - `payment_status = 'paid'`
   - `pdf_fulfillment_status = 'pending'`
   - `stripe_payment_intent_id = ...`
   - `stripe_checkout_session_id = ...`
   - `stripe_customer_id = ...` if present
   - `vip_paid_at = event_created_at`
   - `email` and `email_normalized` set to the successful checkout email only if this is a newly created row
6. Update the webhook event row to:
   - `waitlist_entry_id = target row id`
   - `processing_status = 'applied'`
   - `processed_at = now()`

Resulting state:
- user is VIP-paid
- PDF fulfillment is now pending

## 4. PDF fulfillment success

Input:
- waitlist entry id
- DreamPlay Email API response

Process:
1. Send the Easy Moonlight Sonata Nightmare PDF via DreamPlay Email API.
2. On success, update the waitlist row:
   - `pdf_fulfillment_status = 'sent'`
   - `pdf_sent_at = now()`
   - `pdf_last_attempt_at = now()`
   - `pdf_last_error = null`
   - `pdf_fulfillment_attempt_count = pdf_fulfillment_attempt_count + 1`

Resulting state:
- VIP record stays paid
- fulfillment is complete and timestamped

## 5. PDF fulfillment failure

Input:
- waitlist entry id
- DreamPlay Email API error

Process:
1. Attempt email send.
2. On failure, update the waitlist row:
   - `pdf_fulfillment_status = 'failed'`
   - `pdf_last_attempt_at = now()`
   - `pdf_last_error = provider error message`
   - `pdf_fulfillment_attempt_count = pdf_fulfillment_attempt_count + 1`
3. Do not change:
   - `waitlist_tier`
   - `payment_status`
   - `vip_paid_at`
4. Admin can manually retry later by re-running the PDF send for that row.

Resulting state:
- user remains VIP-paid
- fulfillment is failed but recoverable

## 6. Duplicate webhook handling

Primary guard:
- `up_stripe_webhook_events.stripe_event_id` is unique

Secondary guards:
- `up_waitlist_entries.stripe_checkout_session_id` is unique when present
- `up_waitlist_entries.stripe_payment_intent_id` is unique when present

Processing rule:
1. On webhook receipt, insert into `up_stripe_webhook_events` first.
2. If insert conflicts on `stripe_event_id`, return HTTP 200 and do nothing else.
3. If the event is new but the target waitlist row already has the same `stripe_payment_intent_id` and `payment_status = 'paid'`, mark the webhook event as `ignored` and stop.
4. Never create a second VIP row for the same normalized email, checkout session id, or payment intent id.

## Recommended v1 migration order

1. Create `up_waitlist_entries`
2. Create indexes on `up_waitlist_entries`
3. Create `set_updated_at()` trigger
4. Create `up_stripe_webhook_events`
5. Create indexes on `up_stripe_webhook_events`

## One implementation note

I intentionally kept this to two tables for v1.
I did not add a separate PDF-attempt log table yet because the main row already captures enough state for admin retry, audit of last error, and simple CSV export.
