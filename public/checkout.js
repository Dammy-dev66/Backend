(() => {
  const params = new URLSearchParams(location.search);
  const paymentUrl = params.get("paymentUrl");
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
  const cancelUrl = params.get("cancelUrl") || "";
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

    currentQuote = data;
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

  paymentBtn.disabled = !paymentUrl;
  paymentBtn.textContent = paymentUrl ? "Continue to payment" : "Payment not configured";

  paymentBtn.addEventListener("click", () => {
    if (!paymentUrl) {
      error.textContent = "Custom payment is not connected yet. Set CUSTOM_PAYMENT_URL in Vercel to point this page at your payment provider.";
      error.classList.remove("hidden");
      return;
    }

    const target = new URL(paymentUrl);
    if (currentQuote) {
      target.searchParams.set("basePrice", String(currentQuote.basePrice));
      target.searchParams.set("discountAmount", String(currentQuote.discountAmount));
      target.searchParams.set("totalPrice", String(currentQuote.totalPrice));
      if (currentQuote.couponCode) {
        target.searchParams.set("couponCode", currentQuote.couponCode);
      }
    }
    if (productID) target.searchParams.set("productID", productID);
    if (email) target.searchParams.set("email", email);
    if (backUrl) target.searchParams.set("backUrl", backUrl);
    if (returnUrl) target.searchParams.set("returnUrl", returnUrl);
    if (cancelUrl) target.searchParams.set("cancelUrl", cancelUrl);

    const tab = window.open(target.toString(), "_blank");
    if (tab) {
      tab.focus();
    } else {
      location.href = target.toString();
    }
  });
})();
