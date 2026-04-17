# Ultimate Pianist V1 Spec

Updated: 2026-04-17
Status: Draft
Owner: Lionel Yu

## 1. Goal

V1 exists to capture demand and validate paid interest before the full course platform is built.

The product promise in V1 is simple:
- a visitor can join the free waitlist, or
- a visitor can pay $1 to join the VIP waitlist, and
- VIP buyers automatically receive the Easy Moonlight Sonata Nightmare PDF by email.

## 2. User flows

### Free waitlist flow
1. Visitor lands on the Ultimate Pianist page.
2. Visitor enters name and email.
3. System stores the lead as a free waitlist signup.
4. Visitor sees a success state.

### VIP waitlist flow
1. Visitor lands on the Ultimate Pianist page.
2. Visitor clicks the VIP option.
3. Visitor completes the $1 Stripe checkout.
4. Stripe webhook marks the record as paid VIP.
5. System triggers transactional email delivery.
6. Visitor receives the Easy Moonlight Sonata Nightmare PDF.
7. Visitor sees a success or confirmation state.

## 3. Required data fields

Minimum fields for V1:
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

Recommended rule: `email` should be treated as the unique person key for this funnel.

## 4. Edge-case rules

- If someone signs up free twice with the same email, update the existing record instead of creating a duplicate.
- If someone joins free first and later buys VIP with the same email, upgrade the existing record to VIP.
- If someone is already VIP, later free signup attempts should not downgrade them.
- If payment succeeds but email delivery fails, keep the user marked as VIP paid and set `pdf_fulfillment_status = failed` so the admin can retry.
- Stripe webhook handling must be idempotent. Duplicate webhook events must not create duplicate VIP grants or duplicate fulfillment records.

## 5. System choices

Use these tools for V1:
- Frontend: Next.js on Vercel
- Database: Supabase
- Payments: Stripe
- Transactional email: existing DreamPlay email tooling or current transactional email system already in Lionel's stack
- PDF storage: Supabase Storage

## 6. Explicitly out of scope for V1

Do not build these in V1:
- the authenticated lesson platform
- lesson modules and content library
- progress tracking
- monthly, 5-year, and lifetime course purchase flows
- DreamPlay credit redemption
- full analytics dashboard
- mass-email automation
- Teachable migration work beyond what is needed for the VIP PDF

## 7. Definition of done for V1

V1 is done when:
- free signups are stored reliably
- VIP $1 payments are stored reliably
- successful Stripe payments upgrade the correct record to VIP
- the PDF is delivered automatically
- failed fulfillment is visible in admin
- Lionel can review, filter, and export the waitlist
