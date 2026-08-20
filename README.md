# Finbar Backend

Vercel serverless backend for booking integrations.

## Acuity Package Bookings

Live custom booking page:

https://backend-ymlj.vercel.app/

The important rule is that the public page must not decide whether a class is package-covered. The front end sends the package/certificate code to this backend, this backend asks Acuity whether the code is valid for the client and appointment type, and only then creates the appointment with the `certificate` field attached.

That keeps the package credit count inside Acuity as the single source of truth.

### Files

- `api/resolve-package.js` asks Acuity for the active package tied to a client email, order, or product and resolves the certificate behind the scenes.
- `api/book-with-package.js` resolves the package if needed, validates it, and creates the Acuity appointment with the certificate attached.
- `api/webhooks/acuity.js` accepts Acuity webhook events for audit logging and signature verification.
- `api/availability-dates.js` proxies Acuity availability dates to the custom frontend.
- `api/availability-times.js` proxies Acuity availability times to the custom frontend.
- `public/` contains the uniform booking frontend for trial, single, and package flows.
- `lib/acuity.js` wraps Acuity API calls.
- `lib/http.js` handles JSON and CORS helpers.

### Uniform Customer Journey

1. Customer starts on the custom page at `https://backend-ymlj.vercel.app/`.
2. Customer chooses subject, lesson format, and booking type.
3. Trial or single lesson customers pick one slot in the custom UI, enter details, then go to Acuity's secure checkout with the selected slot prefilled.
4. Package customers who already own a package enter the purchase email only. The backend asks Acuity for the valid certificate tied to that email and appointment type, then books only up to the remaining credit balance.
5. Package customers who need to buy first are sent to the exact Acuity package product, then returned to `https://backend-ymlj.vercel.app/return.html`, which immediately bounces them back into the custom booking flow with the subject and lesson type restored.

### Package Purchase Redirect

The custom frontend still includes a return URL for backup, but the reliable fix is Acuity's custom conversion tracking code. Paste this into **Acuity -> Integrations -> Custom conversion tracking**:

```html
<script>
  setTimeout(function () {
    var url = new URL("https://backend-ymlj.vercel.app/return.html");
    url.searchParams.set("type", "%type%");
    url.searchParams.set("email", "%email%");
    url.searchParams.set("orderID", "%id%");
    top.location.replace(url.toString());
  }, 1000);
</script>
```

The redirect brings the customer back to the custom flow without asking for a code. The return page auto-continues into the booking UI after a short pause, and the booking backend resolves the package certificate from Acuity using the client's email and order data.

If the package purchase was opened in a new tab, the return bridge will also try to close the Acuity tab after sending the student back to the custom booking page. If the browser refuses to close it, the custom page still receives the return target and refreshes itself into the booking flow.

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
  "orderID": "123456",
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

Package limit enforcement happens before appointment creation by resolving the certificate from Acuity and then calling Acuity's certificate check endpoint. If the pack has no remaining uses, Acuity returns a certificate error and the backend refuses the package booking.

Double-charging is avoided because the appointment is created with Acuity's `certificate` attribute. The appointment is not independently sent into a full-price checkout path after the user selects "Use package".

### Acuity References

- Acuity's appointments API documents booking appointments with coupons and package certificates by setting the `certificate` attribute: https://developers.acuityscheduling.com/reference/post-appointments
- The same Acuity page lists package-related validation errors including `certificate_uses`, `expired_certificate`, and `invalid_certificate_type`.
- Acuity certificate validation uses `/certificates/check` with `certificate`, `appointmentTypeID`, and optionally `email`.

### Carrd Script Links

- Booking slider / modal behavior: https://backend-ymlj.vercel.app/lesson-dropdown.js
- Booking page: https://backend-ymlj.vercel.app/
- Return bridge: https://backend-ymlj.vercel.app/return.html
