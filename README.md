# Finbar Backend

Vercel serverless backend for Fin's custom booking flow.

## What this repo now does

This project keeps the student inside the custom Fin journey instead of sending them into Acuity's package store.

- Carrd and the custom booking page stay as the front door.
- Package purchase goes through `public/checkout.html` and then into Stripe Checkout, not Acuity's store page.
- Acuity is used behind the scenes for availability, certificate lookup, and appointment creation.
- Package redemption still uses Acuity certificates as the source of truth for remaining credits.
- Coupon codes are percentage-based, package-scoped, and editable from a protected admin panel.

## Main routes

- `public/` is the student-facing custom booking flow.
- `public/checkout.html` is the custom package checkout bridge.
- `public/return.html` is the return bridge back into the booking flow after payment.
- `api/package-checkout.js` builds the custom checkout URL.
- `api/create-stripe-session.js` creates the live Stripe Checkout session.
- `api/webhooks/stripe.js` receives Stripe's checkout completion event, creates the Acuity follow-up record, and sends the Make-powered email for both package purchases and direct paid bookings.
- `api/stripe-complete.js` now only verifies the paid Stripe session so the return page can show confirmation without doing the side effects in the browser.
- `api/payment-complete.js` turns a completed package payment into the Acuity handoff URL and sends the confirmation email for the local/mock payment path when booking details are present.
- `api/admin/coupons.js` lets Fin manage coupon rules from a protected admin panel.
- `api/resolve-package.js` finds the certificate for a package by email, order, or product.
- `api/book-with-package.js` validates the certificate and books the appointment in Acuity.
- `api/availability-dates.js` and `api/availability-times.js` proxy Acuity availability into the custom flow.
- `api/webhooks/acuity.js` accepts Acuity webhook events for logging and audit.
- `npm run dev` starts a local Node server that serves `public/` and the API routes on `http://127.0.0.1:4174`.

## Intended flow

1. The student lands on the custom booking page.
2. They choose subject, lesson format, and booking type.
3. If they already have a package, the backend resolves the Acuity certificate and the student books from the custom page.
4. If they need to buy a package, the custom page opens the checkout bridge instead of Acuity.
5. After payment, the backend creates the package certificate in Acuity and the student returns to `return.html`, which sends them back to the custom booking page.

## Environment variables

```txt
ACUITY_USER_ID=your_numeric_acuity_user_id
ACUITY_API_KEY=rotate_and_add_your_acuity_api_key_here
ALLOWED_ORIGINS=https://your-carrd-site.example,https://your-custom-domain.example
STRIPE_SECRET_KEY=sk_test_or_live_key
STRIPE_WEBHOOK_SECRET=whsec_optional_until_webhooks_are_enabled
FINBAR_RECEIPT_COPY_TO=fin@yourdomain.com
MAKE_RECEIPT_WEBHOOK_URL=https://hook.eu1.make.com/your-webhook-id
FINBAR_ADMIN_KEY=choose_a_long_random_admin_key
BLOB_READ_WRITE_TOKEN=vercel_blob_token_when_connected
CUSTOM_PROMO_CODES={"FIN10":{"percent":10,"label":"10% off","packageKeys":["oneToOne:pack6","oneToTwo:pack6"]}}

# Optional. Leave false if package bookings must never fall through to card checkout.
ALLOW_FULL_PRICE_FALLBACK=false
```

`STRIPE_SECRET_KEY` is required for the live payment checkout.

`MAKE_RECEIPT_WEBHOOK_URL` sends the receipt payload to Make, where the actual email is sent for both package receipts and booking confirmations.

`FINBAR_RECEIPT_COPY_TO` sends Fin a copy of the same receipt email so both the customer and Fin keep the booking link.

`STRIPE_WEBHOOK_SECRET` is used by `/api/webhooks/stripe` to verify Stripe's signed event payload.

In Stripe, point the checkout completion webhook to:

`https://your-project.vercel.app/api/webhooks/stripe`

`FINBAR_ADMIN_KEY` protects the coupon admin panel at `/admin.html`.

`BLOB_READ_WRITE_TOKEN` lets the coupon admin panel persist changes through Vercel Blob. The backend falls back to a local JSON file during local development if Blob is not yet connected.

`CUSTOM_PROMO_CODES` is an optional JSON map of promo code names to discount definitions. Each coupon uses percentage discounts and can target specific package keys like `oneToOne:pack6` or `oneToTwo:pack12`.

For local verification, run `npm run dev` and open `http://127.0.0.1:4174/`. The dev server exercises the same static pages and API handlers used in production, without needing Vercel CLI.

## Notes on Acuity

The Acuity docs and support response confirmed the important constraints:

- private appointment types are hidden from the public scheduler, but direct links still work
- Acuity does not support an automatic redirect after purchase or booking
- package purchases inside Acuity used to expose the `Use Package` path

That is why the student-facing package purchase has been moved out of Acuity and into the custom flow.

## Verification

The current backend is still designed to:

- validate package certificates before booking
- stop package bookings when there are no remaining uses
- create Acuity appointments only after the package is confirmed
- avoid sending the student into Acuity's package store
