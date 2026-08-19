# Finbar Backend

Vercel serverless backend for booking integrations.

## Acuity Package Bookings

Live custom booking page:

https://backend-ymlj.vercel.app/

The important rule is that the public page must not decide whether a class is package-covered. The front end sends the package/certificate code to this backend, this backend asks Acuity whether the code is valid for the client and appointment type, and only then creates the appointment with the `certificate` field attached.

That keeps the package credit count inside Acuity as the single source of truth.

### Files

- `api/validate-package.js` checks whether a package/certificate can be used for a given appointment type and client email.
- `api/book-with-package.js` validates the package and creates the Acuity appointment with the package attached.
- `api/webhooks/acuity.js` accepts Acuity webhook events for audit logging. It is not used as the credit source of truth.
- `api/availability-dates.js` proxies Acuity availability dates to the custom frontend.
- `api/availability-times.js` proxies Acuity availability times to the custom frontend.
- `public/` contains the uniform booking frontend for trial, single, and package flows.
- `lib/acuity.js` wraps Acuity API calls.
- `lib/http.js` handles JSON and CORS helpers.

### Uniform Customer Journey

1. Customer starts on the custom page at `https://backend-ymlj.vercel.app/`.
2. Customer chooses subject, lesson format, and booking type.
3. Trial or single lesson customers pick one slot in the custom UI, enter details, then go to Acuity's secure checkout with the selected slot prefilled.
4. Package customers who already have a code enter it in the custom UI. The backend validates the package and books only up to the remaining Acuity credit balance.
5. Package customers who need to buy first are sent to the exact Acuity package product, then returned to `https://backend-ymlj.vercel.app/return.html` to enter the package code from Acuity and book their sessions.

### Package Purchase Redirect

The custom frontend adds a `returnUrl` parameter to package purchase links, but Acuity may ignore that on some purchase screens. To force the return, add this to Acuity's custom conversion tracking / confirmation script area:

```html
<script>
  setTimeout(function () {
    window.location.href = "https://backend-ymlj.vercel.app/return.html";
  }, 1200);
</script>
```

The redirect can bring the customer back to the custom flow. It cannot automatically fill the package code unless Acuity exposes the code on the confirmation page. The return page asks the customer to use the code shown by Acuity or sent in the receipt email.

### Vercel Environment Variables

```txt
ACUITY_USER_ID=your_numeric_acuity_user_id
ACUITY_API_KEY=your_acuity_api_key
ALLOWED_ORIGINS=https://your-carrd-site.example,https://your-custom-domain.example
ALLOW_FULL_PRICE_FALLBACK=false
```

Rotate the Acuity API key before deployment if it has been pasted into chat or shared anywhere public.

### Front-End Usage

The booking page should call `POST /api/book-with-package` instead of sending a package booking directly from the browser to Acuity.

Example request:

```json
{
  "datetime": "2026-09-01T14:00:00+0100",
  "appointmentTypeID": 123456,
  "calendarID": 987654,
  "firstName": "Jane",
  "lastName": "Parent",
  "email": "jane@example.com",
  "phone": "+353...",
  "certificate": "PACKAGECODE123",
  "timezone": "Europe/Dublin",
  "fields": [
    { "id": 111111, "value": "Student name" }
  ]
}
```

Successful package booking response:

```json
{
  "ok": true,
  "paidByPackage": true,
  "appointment": {}
}
```

If the package is expired, invalid, not valid for that appointment type, or has no remaining uses, the response returns `ok: false` and does not create a package-covered appointment.

### Why This Fixes The Package Bugs

Package limit enforcement happens before appointment creation by calling Acuity's certificate check endpoint. If the pack has no remaining uses, Acuity returns a certificate error and the backend refuses the package booking.

Double-charging is avoided because the appointment is created with Acuity's `certificate` attribute. The appointment is not independently sent into a full-price checkout path after the user selects "Use package".

### Acuity References

- Acuity's appointments API documents booking appointments with coupons/package codes by setting the `certificate` attribute: https://developers.acuityscheduling.com/reference/post-appointments
- The same Acuity page lists package-related validation errors including `certificate_uses`, `expired_certificate`, and `invalid_certificate_type`.
- Acuity certificate validation uses `/certificates/check` with `certificate`, `appointmentTypeID`, and optionally `email`.
