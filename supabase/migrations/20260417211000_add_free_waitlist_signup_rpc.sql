begin;

create or replace function public.upsert_up_free_waitlist_entry(
  p_email text,
  p_email_normalized text,
  p_name text,
  p_source text
)
returns void
language plpgsql
set search_path = public
as $$
begin
  insert into public.up_waitlist_entries (
    email,
    email_normalized,
    name,
    source,
    waitlist_tier,
    payment_status,
    pdf_fulfillment_status
  )
  values (
    p_email,
    p_email_normalized,
    p_name,
    p_source,
    'free',
    'none',
    'not_applicable'
  )
  on conflict (email_normalized) do update
  set
    name = excluded.name,
    updated_at = now();
end;
$$;

commit;
