(() => {
  const params = new URLSearchParams(location.search);
  const summary = document.getElementById("checkoutSummary");
  const priceSummary = document.getElementById("priceSummary");
  const error = document.getElementById("checkoutError");
  const paymentBtn = document.getElementById("paymentBtn");
  const returnLink = document.getElementById("returnLink");
  const couponInput = document.getElementById("couponCodeInput");
  const applyCouponBtn = document.getElementById("applyCouponBtn");

  const subject = params.get("subject") || "Lesson package";
  const format = params.get("format") || "";
  const tier = params.get("tier") || "";
  const appointmentTypeID = params.get("appointmentTypeID") || "";
  const email = params.get("email") || "";
  const backUrl = params.get("backUrl") || "";
  const productID = params.get("productID") || "";
  const returnUrl = params.get("returnUrl") || "";
  const studentName2 = params.get("studentName2") || "";
  const currency = "EUR";
  let currentQuote = null;

  summary.innerHTML = `
    <strong>${subject}</strong><br>
    ${[format, tier].filter(Boolean).join(" - ") || "Package"}
    ${appointmentTypeID ? `<br><span class="muted">Appointment type ${appointmentTypeID}</span>` : ""}
    ${email ? `<br><span class="muted">${email}</span>` : ""}
  `;

  if (backUrl) {
    returnLink.href = backUrl;
  }

  async function quote(couponCode = "") {
    const res = await fetch("/api/checkout-quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ format, tier, couponCode })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      throw new Error(data.error || "We could not calculate the package total.");
    }

    currentQuote = data.couponCode && !data.couponValid ? { ...data, couponCode: "" } : data;
    const lines = [
      `<strong>Base price:</strong> ${currency} ${data.basePrice.toFixed(2)}`,
      data.discountAmount > 0 ? `<strong>Discount:</strong> -${currency} ${data.discountAmount.toFixed(2)}` : `<strong>Discount:</strong> none`,
      `<strong>Total:</strong> ${currency} ${data.totalPrice.toFixed(2)}`
    ];

    if (data.couponCode) {
      lines.push(`<span class="muted">Coupon ${data.couponCode}${data.couponMessage ? ` - ${data.couponMessage}` : ""}</span>`);
    }

    priceSummary.innerHTML = lines.join("<br>");
    error.classList.add("hidden");
    error.textContent = "";

    if (data.couponCode && !data.couponValid) {
      error.textContent = data.couponMessage || "That coupon does not apply to this package.";
      error.classList.remove("hidden");
    }
  }

  async function applyCoupon() {
    try {
      await quote(couponInput.value.trim());
    } catch (err) {
      error.textContent = err.message;
      error.classList.remove("hidden");
      priceSummary.innerHTML = `<strong>Total:</strong> ${currency} 0.00`;
    }
  }

  applyCouponBtn.addEventListener("click", applyCoupon);
  couponInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      applyCoupon();
    }
  });

  quote(params.get("couponCode") || "").catch((err) => {
    error.textContent = err.message;
    error.classList.remove("hidden");
    priceSummary.innerHTML = `<strong>Total:</strong> ${currency} 0.00`;
  });

  paymentBtn.disabled = false;
  paymentBtn.textContent = "Pay";

  paymentBtn.addEventListener("click", async () => {
    error.classList.add("hidden");
    error.textContent = "";
    paymentBtn.disabled = true;
      paymentBtn.textContent = "Opening payment...";

    try {
      const res = await fetch("/api/create-stripe-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          format,
          tier,
          appointmentTypeID,
          productID,
          email,
          backUrl,
          datetime: params.get("datetime") || "",
          calendarID: params.get("calendarID") || "",
          firstName: params.get("firstName") || "",
          lastName: params.get("lastName") || "",
          phone: params.get("phone") || "",
          studentName: params.get("studentName") || "",
          studentName2: params.get("studentName2") || "",
          studentFieldID: params.get("studentFieldID") || "",
          notes: params.get("notes") || "",
          timezone: params.get("timezone") || "",
          couponCode: currentQuote?.couponCode || params.get("couponCode") || ""
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok || !data.url) {
        throw new Error(data.error || "Stripe checkout could not be created.");
      }

      location.href = data.url;
    } catch (err) {
      error.textContent = err.message;
      error.classList.remove("hidden");
      paymentBtn.disabled = false;
      paymentBtn.textContent = "Pay";
    }
  });
})();
