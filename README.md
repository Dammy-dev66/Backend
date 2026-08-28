# Finbar Backend

Vercel serverless backend for Finbar B. Elite Tutoring's custom booking flow.

This repo exists to keep students inside Fin's own booking experience instead of sending them into a messy Acuity-only path. The backend handles availability, checkout, package redemption, coupon logic, booking handoff, and post-payment receipts.

## What This Project Is Doing

The customer journey is now built around the custom Fin flow:

1. Carrd sends the student into the custom booking page.
2. The custom page pre-fills the subject, lesson format, and booking type.
3. Trial and single lessons stay inside the custom flow from start to finish.
4. Package purchases go through Stripe Checkout from the custom flow.
5. After payment, the backend creates the Acuity package certificate or appointment record behind the scenes.
6. The student returns to a confirmation page that includes a button back to the sessions page.
7. The confirmation email also carries the sessions link, so students can return later if they do not book immediately.

There is intentionally **no automatic redirect after payment**. The post-payment experience uses a confirmation page with a button to the sessions page.

## What We Have Built So Far

### 1. The custom front door

We replaced the idea of sending people directly into Acuity with a custom front-end booking flow.

- Carrd remains the traffic source.
- The custom booking page is the real booking experience.
- Subject, format, and booking type are carried through the flow so students do not have to re-enter them.
- The page was cleaned up so the copy is more student-friendly and less generic.

### 2. Booking types for all lesson paths

We made the booking flow cover:

- trial lessons
- single lessons
- 6-class packages
- 12-class packages

This was important because the earlier flow only really handled package bookings. The current setup treats lesson selection more uniformly.

### 3. Package checkout moved out of Acuity

We stopped depending on Acuity's package purchase flow for the student-facing checkout.

- `public/checkout.html` is the custom package checkout bridge.
- `api/package-checkout.js` builds the checkout URL.
- `api/create-stripe-session.js` creates the Stripe Checkout session.
- The goal is that students pay through the custom flow, not through Acuity's package store.

### 4. Stripe webhook-driven fulfillment

Post-payment actions were moved out of the browser and into the Stripe webhook.

That means the backend now handles fulfillment after payment:

- create the Acuity certificate for package purchases
- create the Acuity appointment for direct bookings
- send the receipt/confirmation email through the Make webhook

This is more reliable than trying to do the real work from a return page in the browser.

### 5. The return page became a confirmation bridge

`public/return.html` used to be treated like a place to continue processing.

Now it is a display-only confirmation page:

- it confirms payment
- it shows the booking summary
- it includes a button back to the sessions page
- it does not auto-redirect the student somewhere else

That matches the instruction that students should click a button to continue, not be thrown around automatically.

### 6. Receipts and booking emails

We switched the email path to Make so both the student and Fin can receive the receipt/confirmation message.

The email payload includes the sessions link, so the customer can come back and book the remaining sessions later.

The email logic is built so it can support:

- package receipt emails
- direct booking confirmation emails
- customer recipient
- Fin copy recipient

### 7. Coupon admin panel

We added a protected coupon admin area so Fin can manage package discounts without editing code directly every time.

The coupon system supports:

- percentage discounts
- package-specific targeting
- active/inactive state
- admin protection through a key

This was built so coupon behavior can be adjusted later without changing the main booking flow.

### 8. Booking dashboard source of truth

The admin area now goes beyond coupons and acts as the shared booking dashboard.

It can store and manage:

- subjects
- lesson types / package tiers
- Acuity appointment type IDs
- Acuity product/package IDs
- calendar IDs
- direct booking links

The public booking page and Carrd helper both read from the shared booking config endpoint, so subject and lesson mappings can be updated from the dashboard without hardcoding every route in two separate places.

### 9. 1:2 booking support

The custom flow was expanded for 1:2 lessons.

- the details step now carries two student names
- the checkout metadata passes both student fields through
- the Acuity booking handoff includes both names in the notes/details path

### 10. Calendar and slot selection cleanup

The time picker and calendar layout were tightened up so the view is cleaner and more centered.

We also adjusted the booking step so it auto-opens to the first available slot set instead of making the student click around just to reveal times.

### 11. Copy and branding cleanup

We updated a lot of the visible text to remove generic or confusing wording.

Examples:

- `Back to Carrd` became `Back to site`
- `See times` became `Select dates/times`
- `oneToOne` / `oneToTwo` were replaced with `Tutor + one student` / `Tutor + two students`
- the pay button was made visually distinct
- the logo treatment was standardized so the brand is consistent

## Important Decisions We Confirmed

### Acuity

We confirmed from Acuity support that:

- private appointment types hide things from the public scheduler, but direct links can still work
- Acuity does not support the automatic redirect behavior we originally wanted
- if students are buying packages directly in Acuity, Acuity can still expose the `Use Package` path and send them into booking screens we do not want them using

That is why we moved the customer journey into the custom flow and stopped relying on Acuity as the front-facing booking experience.

### Vercel deployment limit

Vercel Hobby only allows up to 12 serverless functions per deployment.

We hit that limit, found the deployment error, and fixed it by removing the unused `api/stripe-complete.js` function.

That was an important deployment lesson because the app was failing even though the code changes themselves were fine.

### Stripe webhook scope

We also found that the Stripe event destination in Workbench was initially scoped to **Connected accounts**.

For this booking flow, we need the webhook destination to listen to **Your account** unless the business is truly using Stripe Connect.

This is one of the current live verification items because it directly affects whether Stripe sends `checkout.session.completed` to the Vercel webhook.

### Make webhook

The app now sends the receipt payload to Make.

We tested the webhook handoff directly and confirmed that Make accepted the payload, which means the issue is not the basic POST request itself. The remaining question is whether the Stripe webhook is reaching Vercel consistently during a real payment.

## Current Status As Of August 27, 2026

The backend currently does the following:

- serves the custom booking flow
- supports trial, single, 6-class, and 12-class paths
- handles package checkout through Stripe
- uses Acuity behind the scenes for package certificates and appointments
- sends receipt/confirmation payloads to Make
- keeps the student on the custom flow instead of sending them into Acuity's package store
- returns students to a confirmation page with a button back to sessions
- includes a working coupon admin panel
- supports 1:2 bookings
- passes tests locally
- deploys successfully to Vercel again after the function-count fix

The main thing still being verified is the full payment-to-email chain in Stripe test/live mode.

## What We Are Doing Right Now

The current focus is the reliability chain after payment:

1. Stripe completes the checkout.
2. Stripe sends `checkout.session.completed`.
3. Vercel receives the webhook.
4. Vercel creates the Acuity record if needed.
5. Vercel sends the receipt payload to Make.
6. Make sends the actual email.

We already confirmed that:

- the custom checkout works
- the Vercel deployment is healthy again
- the Make webhook accepts payloads

We are still verifying the exact Stripe webhook configuration and event delivery scope so the payment event reaches the backend every time.

## What Remains Before This Project Is Finished

Before we can call this fully done, the remaining work is:

1. Confirm the Stripe webhook destination is correctly scoped to the right account type.
2. Confirm `checkout.session.completed` is actually delivered in the same mode as the payment test.
3. Confirm the Make scenario sends the customer email and Fin copy every time.
4. Run a final end-to-end booking test for:
   - trial lesson
   - single lesson
   - package purchase
   - 1:2 booking
5. Do one final copy/design pass if Fin wants more wording or layout changes.

## Main Routes

- `public/` is the student-facing custom booking flow.
- `public/checkout.html` is the package checkout bridge.
- `public/return.html` is the post-payment confirmation bridge.
- `public/admin.html` is the protected coupon admin panel.
- `api/package-checkout.js` builds the custom checkout URL.
- `api/create-stripe-session.js` creates the Stripe session.
- `api/webhooks/stripe.js` handles Stripe completion events and triggers fulfillment.
- `api/payment-complete.js` supports the local/mock payment path for older tests.
- `api/admin/coupons.js` manages coupon rules.
- `api/resolve-package.js` finds package certificates.
- `api/book-with-package.js` validates package redemption and books the appointment.
- `api/availability-dates.js` and `api/availability-times.js` proxy Acuity availability.
- `api/webhooks/acuity.js` accepts Acuity webhook events for logging and audit.

## Environment Variables

Use these in Vercel and local development:

```txt
ACUITY_USER_ID=your_numeric_acuity_user_id
ACUITY_API_KEY=rotate_and_add_your_acuity_api_key_here
ALLOWED_ORIGINS=https://your-carrd-site.example,https://your-custom-domain.example
STRIPE_SECRET_KEY=sk_test_or_live_key
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret
FINBAR_RECEIPT_COPY_TO=fin@yourdomain.com
MAKE_RECEIPT_WEBHOOK_URL=https://your-make-webhook-url
FINBAR_ADMIN_KEY=choose_a_long_random_admin_key
BLOB_READ_WRITE_TOKEN=vercel_blob_token_when_connected
CUSTOM_PROMO_CODES={"FIN10":{"percent":10,"label":"10% off","packageKeys":["oneToOne:pack6","oneToTwo:pack6"],"active":true}}

# Optional. Leave false if package bookings must never fall through to card checkout.
ALLOW_FULL_PRICE_FALLBACK=false
```

Notes:

- `STRIPE_SECRET_KEY` is required for live checkout.
- `STRIPE_WEBHOOK_SECRET` is required if the Stripe webhook should verify signed payloads.
- `MAKE_RECEIPT_WEBHOOK_URL` tells the backend where to send the email payload after payment.
- `FINBAR_RECEIPT_COPY_TO` sends Fin a copy of the same receipt/confirmation email.
- `BLOB_READ_WRITE_TOKEN` is used so the coupon admin panel can persist changes in Vercel Blob.

## Local Development

Run:

```bash
npm install
npm test
npm run dev
```

Then open:

`http://127.0.0.1:4174/`

## Testing

The test suite covers:

- pricing and coupon math
- package checkout URL generation
- booking validation
- receipt email payloads
- Stripe webhook handling
- the package redemption path
- the direct booking path

We also used Vercel deployment logs to confirm the function-count failure and then verify the redeploy after fixing it.

## Project Log Summary

In plain language, this is the journey so far:

- We started with an Acuity-heavy flow that did not fit Fin's booking experience.
- We moved the customer experience into a custom booking page.
- We pushed package checkout out of Acuity and into Stripe.
- We made post-payment handling happen on the server instead of in the browser.
- We added coupon management, package lookup, and 1:2 support.
- We fixed a Vercel Hobby deployment error by reducing the number of serverless functions.
- We verified the Make webhook transport.
- We are now finishing the Stripe webhook delivery chain so the emails always trigger after payment.

That is the part of the system still being tightened right now.
