(() => {
  const params = new URLSearchParams(location.search);
  const summary = document.getElementById("mockSummary");
  const completeBtn = document.getElementById("completeBtn");
  const cancelBtn = document.getElementById("cancelBtn");

  const returnUrl = params.get("returnUrl") || "/";
  const cancelUrl = params.get("cancelUrl") || "/";
  const totalPrice = params.get("totalPrice") || "0.00";
  const couponCode = params.get("couponCode") || "";
  const subject = params.get("subject") || "Lesson";
  const format = params.get("format") || "";
  const tier = params.get("tier") || "";
  const appointmentTypeID = params.get("appointmentTypeID") || "";
  const email = params.get("email") || "";
  const backUrl = params.get("backUrl") || "";
  const datetime = params.get("datetime") || "";
  const calendarID = params.get("calendarID") || "";
  const firstName = params.get("firstName") || "";
  const lastName = params.get("lastName") || "";
  const phone = params.get("phone") || "";
  const studentName = params.get("studentName") || "";
  const studentName2 = params.get("studentName2") || "";
  const studentFieldID = params.get("studentFieldID") || "";
  const notes = params.get("notes") || "";
  const timezone = params.get("timezone") || "";
  const productID = params.get("productID") || "";
  const orderID = params.get("orderID") || "";
  const source = params.get("source") || "mock-payment";

  summary.innerHTML = `
    <strong>${subject}</strong><br>
    ${tier || "Package"}<br>
    <strong>Total:</strong> EUR ${Number(totalPrice).toFixed(2)}
    ${couponCode ? `<br><span class="muted">Coupon ${couponCode}</span>` : ""}
  `;

  completeBtn.addEventListener("click", () => {
    fetch("/api/payment-complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject,
        format,
        tier,
        appointmentTypeID,
        email,
        productID,
        backUrl,
        datetime,
        calendarID,
        firstName,
        lastName,
        phone,
        studentName,
        studentName2,
        studentFieldID,
        notes,
        timezone,
        orderID,
        couponCode,
        totalPrice,
        source
      })
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.ok || !data.url) {
          throw new Error(data.error || "Unable to finish payment.");
        }
        location.href = data.url;
      })
      .catch(() => {
        const target = new URL(returnUrl);
        if (couponCode) target.searchParams.set("couponCode", couponCode);
        target.searchParams.set("totalPrice", totalPrice);
        location.href = target.toString();
      });
  });

  cancelBtn.addEventListener("click", () => {
    location.href = cancelUrl;
  });
})();
