# Ultimate Pianist, Step-by-Step Plan

Updated: 2026-04-17
Status: Drafted, ready for review

## Goal

Launch the front-door funnel first, free waitlist plus paid VIP waitlist, before building the full lesson platform.

## Recommended build order

### 1. Lock the v1 scope
- Define Phase 1 as a working waitlist and VIP funnel
- Explicitly defer the full lesson platform until the funnel works end to end

### 2. Define the data model
- Create Supabase tables for leads, waitlist signups, VIP status, fulfillment status, source tags, and timestamps
- Use migrations first, not manual schema edits

### 3. Build the free waitlist signup
- Connect the landing page form
- Save free signups in Supabase
- Show a basic success state

### 4. Build the paid VIP signup
- Connect the existing $1 Stripe VIP flow
- Store pending and completed payment states cleanly

### 5. Build the Stripe webhook
- On successful VIP payment, mark the user as VIP
- Persist Stripe identifiers for auditability
- Trigger fulfillment automatically

### 6. Deliver the VIP reward automatically
- Send the Easy Moonlight Sonata Nightmare PDF by transactional email
- Track `pdf_sent` or equivalent fulfillment state

### 7. Build the waitlist admin view
- Search and filter leads
- Show free versus VIP counts
- Export CSV
- Show payment and fulfillment status

### 8. Connect the landing page CTAs end to end
- Free waitlist button
- VIP waitlist button
- Thank-you and success states
- Preview deploy on Vercel

### 9. Run end-to-end testing
- Free signup test
- VIP payment test
- Stripe webhook test
- PDF delivery test
- Duplicate signup and retry handling

### 10. Prepare launch operations
- Segment free and VIP users
- Finalize the announcement video
- Make sure Lionel can inspect and export the list before any larger push

### 11. Build the core lesson platform
- Auth
- Lesson modules by piece and difficulty
- Video embeds
- PDFs and notes
- Progress tracking
- Mobile-friendly student pages

### 12. Add paid tier access control
- $39 monthly
- $197 5-year
- $394 lifetime
- VIP 24-hour early access rules

### 13. Add DreamPlay credits
- Only for 5-year and lifetime tiers
- Apply VIP multiplier rules
- Store the credit amount on the user record at purchase time
- Add redemption later

### 14. Build the fuller admin dashboard
- Users
- Content
- Waitlist analytics
- Email-triggered updates

## Recommendation

The real immediate build is Steps 1 through 9.
That gets the funnel, payment, fulfillment, and admin visibility working before time goes into the full course platform.

## Notes

- Monthly is intentionally a decoy tier and should not be optimized for conversion
- The $197 5-year plan is the main conversion target
- The $1 VIP payment should automatically trigger delivery of the Easy Moonlight Sonata Nightmare PDF
- Do not change Stripe pricing, database data, or production environment settings without approval
