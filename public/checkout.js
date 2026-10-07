(() => {
  const params = new URLSearchParams(location.search);
  const summary = document.getElementById("checkoutSummary");
  const priceSummary = document.getElementById("priceSummary");
  const error = document.getElementById("checkoutError");
  const paymentBtn = document.getElementById("paymentBtn");
  const returnLink = document.getElementById("returnLink");
  const couponInput = document.getElementById("couponCodeInput");
  const applyCouponBtn = document.getElementById("applyCouponBtn");
  const policyAcknowledgement = document.getElementById("policyAcknowledgement");
  const lessonPolicyText = document.getElementById("lessonPolicyText");
  const lessonPolicyAccepted = document.getElementById("lessonPolicyAccepted");

  const subject = params.get("subject") || "Lesson package";
  const subjectId = params.get("subjectId") || "";
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
  let currentPolicyText = "";
  let currentPolicyVersion = "";

  function refreshPaymentButton() {
    paymentBtn.disabled = !currentQuote || Boolean(currentPolicyText && !lessonPolicyAccepted.checked);
  }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]);
  }

  function safeWebUrl(value) {
    try {
      const url = new URL(String(value || ""), location.origin);
      return url.protocol === "https:" || (url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(location.hostname))
        ? url.toString()
        : "";
    } catch {
      return "";
    }
  }

  function renderSummary(subjectName) {
    const formatLabel = { oneToOne: "One student (1:1)", oneToTwo: "Two students (1:2)" }[format] || "Lesson";
    const tierLabel = { trial: "Trial class", single: "Single lesson", pack6: "6-class package", pack12: "12-class package" }[tier] || "";
    summary.innerHTML = `
      <strong>${escapeHtml(subjectName)}</strong><br>
      ${escapeHtml([formatLabel, tierLabel].filter(Boolean).join(" · "))}
      ${email ? `<br><span class="muted">${escapeHtml(email)}</span>` : ""}
    `;
  }

  renderSummary(subject);

  const safeBackUrl = safeWebUrl(backUrl);
  if (safeBackUrl) {
    returnLink.href = safeBackUrl;
  }

  async function quote(couponCode = "") {
    currentQuote = null;
    refreshPaymentButton();
    const res = await fetch("/api/checkout-quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, subjectId, format, tier, appointmentTypeID, productID, couponCode })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      throw new Error(data.error || "We could not calculate the package total.");
    }

    currentQuote = data.couponCode && !data.couponValid ? { ...data, couponCode: "" } : data;
    renderSummary(data.subjectName || subject);
    if (currentPolicyVersion && currentPolicyVersion !== data.policyVersion) lessonPolicyAccepted.checked = false;
    currentPolicyText = String(data.policyText || "");
    currentPolicyVersion = String(data.policyVersion || "");
    lessonPolicyText.textContent = currentPolicyText;
    policyAcknowledgement.classList.toggle("hidden", !currentPolicyText);
    const lines = [
      `<strong>Base price:</strong> ${currency} ${data.basePrice.toFixed(2)}`,
      data.discountAmount > 0 ? `<strong>Discount:</strong> -${currency} ${data.discountAmount.toFixed(2)}` : `<strong>Discount:</strong> none`,
      `<strong>Total:</strong> ${currency} ${data.totalPrice.toFixed(2)}`
    ];

    if (data.couponCode) {
      lines.push(`<span class="muted">Coupon ${escapeHtml(data.couponCode)}${data.couponMessage ? ` - ${escapeHtml(data.couponMessage)}` : ""}</span>`);
    }

    priceSummary.innerHTML = lines.join("<br>");
    refreshPaymentButton();
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
  lessonPolicyAccepted.addEventListener("change", () => {
    refreshPaymentButton();
  });
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

  paymentBtn.disabled = true;
  paymentBtn.textContent = "Pay";

  paymentBtn.addEventListener("click", async () => {
    if (!currentQuote) {
      error.textContent = "Wait for the current lesson price to load before paying.";
      error.classList.remove("hidden");
      return;
    }
    if (currentPolicyText && !lessonPolicyAccepted.checked) {
      error.textContent = "Read and accept the current lesson policy before paying.";
      error.classList.remove("hidden");
      return;
    }
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
          subjectId,
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
          couponCode: currentQuote.couponCode || "",
          quotedTotalCents: Math.round(currentQuote.totalPrice * 100),
          policyAccepted: Boolean(currentPolicyText && lessonPolicyAccepted.checked),
          policyVersion: currentPolicyVersion
        })
      });

      const data = await res.json().catch(() => ({}));
      if (res.status === 409 && data.code === "PRICE_CHANGED") {
        const couponCode = currentQuote.couponCode || "";
        await quote(couponCode);
        throw new Error(data.error || "Review the updated total before paying.");
      }
      if (!res.ok || !data.ok || !data.url) {
        throw new Error(data.error || "Stripe checkout could not be created.");
      }

      location.href = data.url;
    } catch (err) {
      error.textContent = err.message;
      error.classList.remove("hidden");
      refreshPaymentButton();
      paymentBtn.textContent = "Pay";
    }
  });
})();
