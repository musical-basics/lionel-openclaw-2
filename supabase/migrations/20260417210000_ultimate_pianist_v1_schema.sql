begin;

create extension if not exists pgcrypto with schema extensions;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

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

create trigger up_waitlist_entries_set_updated_at
before update on public.up_waitlist_entries
for each row
execute function public.set_updated_at();

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

create unique index up_stripe_webhook_events_event_uidx
  on public.up_stripe_webhook_events (stripe_event_id);

create index up_stripe_webhook_events_checkout_session_idx
  on public.up_stripe_webhook_events (stripe_checkout_session_id);

create index up_stripe_webhook_events_payment_intent_idx
  on public.up_stripe_webhook_events (stripe_payment_intent_id);

create index up_stripe_webhook_events_created_at_idx
  on public.up_stripe_webhook_events (created_at desc);

commit;
