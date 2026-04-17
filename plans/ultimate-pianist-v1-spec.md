# Ultimate Pianist V1 Contract / Spec

Updated: 2026-04-17

## Exact v1 promise

A visitor can either join the free waitlist or pay $1 to join the VIP waitlist.
If the visitor completes the $1 VIP payment successfully, they are marked as VIP and automatically receive the Easy Moonlight Sonata Nightmare PDF by email.
Nothing else is promised in v1.

## Free user flow
1. Visitor lands on the Ultimate Pianist page.
2. Visitor enters name and email.
3. System stores the record as a free waitlist signup.
4. Visitor sees a success state.

## VIP user flow
1. Visitor lands on the Ultimate Pianist page.
2. Visitor clicks the VIP option.
3. Visitor completes the $1 Stripe checkout.
4. Stripe webhook verifies the successful payment.
5. If the Stripe checkout email exactly matches an existing free waitlist record, system upgrades that record to VIP.
6. If the Stripe checkout email does not exactly match an existing record, system creates a new VIP record and does not auto-merge.
7. System triggers transactional email delivery of the Easy Moonlight Sonata Nightmare PDF.
8. Visitor sees a success or confirmation state.

## Required data fields
- `id`
- `name`
- `email`
- `source`
- `waitlist_tier` (`free` or `vip`)
- `payment_status` (`none`, `pending`, `paid`, `failed`, `refunded`)
- `pdf_fulfillment_status` (`not_applicable`, `pending`, `sent`, `failed`)
- `stripe_customer_id`
- `stripe_checkout_session_id`
- `stripe_payment_intent_id`
- `vip_paid_at`
- `pdf_sent_at`
- `created_at`
- `updated_at`

Recommended rule: `email` is the unique person key only on exact match. The successful Stripe checkout email is the canonical email for the VIP record.

## Edge-case rules
- If someone signs up free twice with the same email, update the existing record instead of creating a duplicate.
- If someone joins free first and later buys VIP with the same email, upgrade the existing record to VIP.
- If the free signup email and VIP checkout email do not exactly match, do not auto-merge. Create a new VIP record and leave any merge as a manual admin decision.
- If someone is already VIP, a later free signup must not downgrade them.
- If payment succeeds but email delivery fails, keep the user marked as VIP paid, set `pdf_fulfillment_status = failed`, and allow manual admin retry of PDF fulfillment.
- Stripe webhook handling must be idempotent. Duplicate events must not create duplicate VIP grants or duplicate fulfillment.

## Tech choices
- Frontend: Next.js on Vercel
- Database: Supabase
- Payments: Stripe
- Transactional email: DreamPlay Email API
- PDF storage: Supabase Storage

## Explicit out-of-scope list
- authenticated lesson platform
- lesson modules and content library
- progress tracking
- monthly, 5-year, and lifetime course purchase flows
- DreamPlay credit redemption
- large analytics or content dashboard work beyond a simple admin list, CSV export, and manual PDF retry
- mass-email automation
- Teachable migration work beyond what is needed for the VIP PDF
