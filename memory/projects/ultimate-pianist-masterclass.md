# Ultimate Pianist Masterclass

> Lionel Yu's premium online piano masterclass, built around Lionel's own arrangements and designed to cross-sell into DreamPlay keyboards.

## Product and audience

Ultimate Pianist is an online masterclass for ambitious hobbyist pianists, aimed mainly at Lionel's existing YouTube audience and sheet music buyers rather than conservatory-track students.
The course teaches Lionel's own arrangements at Easy, Medium, and Full difficulty levels, alongside fundamentals content migrated from Teachable.
As of 2026-04-17, the domain is `ultimatepianist.com` and the current deployment is `ultimate-pianist-masterclass.vercel.app`.

## Business model and pricing

The main offer uses three pricing tiers: monthly at $39, 5-year access at $197, and lifetime access at $394.
The monthly tier is intentionally a decoy and should not be optimized for conversion.
The $197 5-year tier is the main conversion target.
These are intro prices that are expected to rise to $297 and $497 after roughly three months.

Masterclass purchases can generate DreamPlay keyboard credits.
Monthly subscribers get no credits.
Public buyers get 1x credit on the 5-year and lifetime tiers, while VIP waitlist buyers get 2x credit on 5-year access and 1.5x credit on lifetime access.
VIP status persists after upgrade, and the credit amount is calculated once at purchase time and stored on the user record.

## Current assets and traction

The project already has a VIP waitlist landing page on Vercel, a $1 Stripe VIP waitlist payment link, and a free waitlist path.
Lionel also has an announcement video in progress, about 100 existing lesson videos migrating from Teachable through Dropbox, and a Musical Basics email list of about 6,000 subscribers.
The hero content is Moonlight Sonata Nightmare, which is also the top seller in Lionel's ecosystem with 511 paid sales and $4,153 in revenue.
The Easy arrangement PDF for Moonlight Sonata Nightmare is complete and is intended to be the automatic VIP waitlist reward.

## Current build priorities

The first build priority is a waitlist system that stores both free and paid VIP signups, tags VIP status, delivers the Easy Moonlight Sonata Nightmare PDF automatically, and gives Lionel an admin view with exports and VIP versus free counts.
The second priority is the core platform: auth, externally hosted video lessons, lesson modules by piece and difficulty, downloadable PDFs, notes, progress tracking, and mobile-friendly student pages.
The third priority is payments and access control through Stripe, including 24-hour early access for VIP waitlist members.
The fourth priority is the DreamPlay credit system, with prominent credit-balance display and a redemption path into the DreamPlay store.
The fifth priority is an admin dashboard for users, content, waitlist analytics, and email-triggered updates.

## Preferred stack and integrations

Lionel prefers Next.js and React on Vercel, with Supabase for database and likely auth, Stripe for payments, and Tailwind for styling.
Video should be hosted externally through Vimeo Pro or Mux, not self-hosted.
PDF storage can use Supabase Storage or Cloudflare R2.
For the v1 waitlist funnel, transactional email is locked to the DreamPlay Email API.
Existing infrastructure worth reusing includes the DreamPlay Email API, a current Supabase setup, Stripe, and Vercel.

## Design direction

The intended look is dark, luxurious, and concert-hall-like.
The palette centers on deep black, warm gold, cream, and muted warm gray, with elegant serif headings and clean sans-serif body text.
The feel should be spacious and premium rather than cramped or utilitarian.

## Important business rules and safeguards

Monthly subscribers do not get keyboard credits.
All paid tiers get the same content access.
VIP waitlist members get 24-hour early access before public launch.
The $1 VIP payment should automatically trigger delivery of the Easy arrangement PDF.
If the Stripe checkout email matches an existing free-waitlist email exactly, the existing record should be upgraded to VIP.
If the Stripe checkout email does not match exactly, the system should create a new VIP record and never auto-merge the identities.
If PDF delivery fails after successful payment, the user should remain marked as VIP paid and the fulfillment should be manually retryable by admin.

Operational safeguards mirror the DreamPlay precedent: do not auto-send mass email without Lionel's approval, do not delete user or database data without approval, do not modify `.env` files without approval, do not run destructive database commands, do not change Stripe pricing without approval, always use migrations for schema changes, and deploy to preview or staging before production.

## Immediate implementation tasks

The immediate implementation sequence is: create Supabase tables and migrations, build the waitlist endpoint, build the Stripe webhook handler for VIP signup and PDF delivery, build the waitlist admin view, connect the landing page CTA actions, and set up transactional email for VIP welcome plus the PDF.
After that, the project can expand into the full authenticated lesson platform and paid-tier flows.

## V1 schema decisions

The recommended v1 data model uses two Supabase tables: `up_waitlist_entries` as the main funnel record and `up_stripe_webhook_events` for idempotent Stripe webhook processing and audit.
The model is one row per normalized email, not one row per real-world person.
The v1 matching rule treats an email match as an exact match on `email_normalized = lower(trim(email))`, which preserves the no-auto-merge rule while avoiding case and whitespace duplicates.
In this schema, `waitlist_tier` means granted state, not checkout intent, so a pending VIP checkout keeps `waitlist_tier = 'free'` until Stripe confirms payment.
The main row tracks `waitlist_tier`, `payment_status`, `pdf_fulfillment_status`, Stripe ids, VIP payment timing, the latest PDF fulfillment error, and a fulfillment-attempt count.
The payment success page and PDF delivery are separate steps in v1: successful payment moves the row to `pdf_fulfillment_status = 'pending'`, and PDF sending completes asynchronously afterward.
For v1, PDF retry history stays on the main row instead of using a separate fulfillment-attempt log table.
The free signup implementation uses a server-side endpoint, a generic success response for both new and duplicate submissions, and an idempotent upsert keyed by `email_normalized` that never downgrades pending-VIP or VIP rows.
In v1, `source` is first-touch, not last-touch, so duplicate free signups update `name` and `updated_at` but do not overwrite the original `source` value.
The free signup endpoint should also have a minimal IP-based rate limit and return `429 rate_limited` on abuse throttling.
The VIP checkout-start implementation uses a server-side `POST /api/waitlist/vip/checkout` endpoint that creates or reuses a Stripe Checkout Session but does not grant VIP before webhook confirmation.
At checkout start, a non-paid row moves to `payment_status = 'pending'` and stores the latest `stripe_checkout_session_id`, `stripe_customer_id`, and `vip_checkout_started_at`, while preserving first-touch `source`, granted `waitlist_tier`, and all fulfillment fields.
If a row is already VIP-paid, v1 should return `already_vip` instead of creating a second checkout session.
If a row is pending, session reuse is a server-side decision based on current Stripe session state: reuse only if the stored Checkout Session is still open, return `payment_processing` if Stripe shows it completed while the local row is still pending, and create a fresh replacement session only when the stored pending session is stale or unusable.
The `/vip/cancel` return route is read-only in v1 and must not mutate any database state.
The Step 5 payment-confirmation implementation uses a server-side `POST /api/stripe/webhook` endpoint with raw-body Stripe signature verification against the server-owned webhook secret.
In v1, only verified paid `checkout.session.completed` events for `metadata.flow = 'ultimate_pianist_v1_vip_waitlist'` can grant VIP.
Webhook idempotency is anchored on unique `stripe_event_id` rows in `up_stripe_webhook_events`, with row lookup by `stripe_checkout_session_id` first and `email_normalized` second.
If neither lookup finds a row, the successful checkout email becomes a new canonical VIP row, using verified `metadata.source` when present and otherwise `source = 'stripe_webhook_vip'`.
Webhook payment success updates the row to `waitlist_tier = 'vip'`, `payment_status = 'paid'`, and `pdf_fulfillment_status = 'pending'` without sending the PDF synchronously, while non-success or unrelated verified events are recorded and ignored in v1.

## Recommended execution sequence

The recommended v1 build order is to finish the front-door funnel before building the full course product.
Start by locking scope around a working waitlist plus VIP funnel, then define the Supabase schema for leads, VIP status, fulfillment state, source tags, and timestamps.
Next, build the free waitlist signup flow, then the paid $1 VIP signup flow through Stripe.
After that, implement the Stripe webhook so successful VIP payments mark the user correctly and trigger automatic delivery of the Easy Moonlight Sonata Nightmare PDF.
Once fulfillment works, build the admin view with search, filters, exports, and clear free-versus-VIP counts.
Then connect the landing page CTA buttons and success states end-to-end, deploy to preview, and run full flow testing for free signup, VIP payment, webhook handling, PDF delivery, and duplicate or retry edge cases.
Only after the funnel, payment, and fulfillment path is solid should the project expand into the authenticated lesson platform, paid access tiers, VIP early-access logic, DreamPlay credits, and the fuller analytics and content admin dashboard.

### Related

- DreamPlay is the keyboard hardware cross-sell partner and uses keyboard-credit incentives inside this funnel.
- Lionel is migrating existing teaching content from Teachable into this new system.

### Updated

2026-04-17 — Created from Lionel's shared `CLAUDE.md` project brief in the private MusicalBasics Discord server
