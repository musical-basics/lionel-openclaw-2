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
5. System upgrades or creates the record as VIP.
6. System triggers transactional email delivery of the Easy Moonlight Sonata Nightmare PDF.
7. Visitor sees a success or confirmation state.

## Required data fields
- `id`
- `name`
- `email`
- `source`
- `signup_type` (`free` or `vip`)
- `vip_status` (`false` or `true`)
- `payment_status` (`none`, `pending`, `paid`, `failed`, `refunded`)
- `pdf_fulfillment_status` (`not_applicable`, `pending`, `sent`, `failed`)
- `stripe_customer_id`
- `stripe_checkout_session_id`
- `stripe_payment_intent_id`
- `vip_paid_at`
- `pdf_sent_at`
- `created_at`
- `updated_at`

Recommended rule: `email` is the unique person key for this funnel.

## Edge-case rules
- If someone signs up free twice with the same email, update the existing record instead of creating a duplicate.
- If someone joins free first and later buys VIP with the same email, upgrade the existing record to VIP.
- If someone is already VIP, a later free signup must not downgrade them.
- If payment succeeds but email delivery fails, keep the user marked as VIP paid and set `pdf_fulfillment_status = failed` so admin can retry.
- Stripe webhook handling must be idempotent. Duplicate events must not create duplicate VIP grants or duplicate fulfillment.

## Tech choices
- Frontend: Next.js on Vercel
- Database: Supabase
- Payments: Stripe
- Transactional email: Lionel's existing DreamPlay or current transactional email tooling
- PDF storage: Supabase Storage

## Explicit out-of-scope list
- authenticated lesson platform
- lesson modules and content library
- progress tracking
- monthly, 5-year, and lifetime course purchase flows
- DreamPlay credit redemption
- full analytics dashboard
- mass-email automation
- Teachable migration work beyond what is needed for the VIP PDF
