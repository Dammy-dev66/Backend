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
- `api/stripe-complete.js` verifies the paid Stripe session and finishes the Acuity handoff.
- `api/payment-complete.js` turns a completed package payment into the Acuity handoff URL and creates the entitlement when package details are present.
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
FINBAR_ADMIN_KEY=choose_a_long_random_admin_key
BLOB_READ_WRITE_TOKEN=vercel_blob_token_when_connected
CUSTOM_PROMO_CODES={"FIN10":{"percent":10,"label":"10% off","packageKeys":["oneToOne:pack6","oneToTwo:pack6"]}}

# Optional. Leave false if package bookings must never fall through to card checkout.
ALLOW_FULL_PRICE_FALLBACK=false
```

`STRIPE_SECRET_KEY` is required for the live payment checkout.

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
