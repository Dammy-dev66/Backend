(function () {
  const params = new URLSearchParams(location.search);
  const appointmentId = params.get("appointmentId") || "";
  const access = params.get("access") || "";
  const meta = document.getElementById("manageMeta");
  const status = document.getElementById("manageStatus");
  const changeButton = document.getElementById("changeLessonBtn");
  const cancelButton = document.getElementById("cancelLessonBtn");
  const panel = document.getElementById("reschedulePanel");
  const dateInput = document.getElementById("rescheduleDate");
  const timeSelect = document.getElementById("rescheduleTime");
  const timeLabel = document.getElementById("timeLabel");
  const confirmButton = document.getElementById("confirmRescheduleBtn");
  let appointment = null;
  let lateWindow = false;
  let pendingActionId = "";
  let mutationInProgress = false;

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  }

  function formatDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "Time to be confirmed" : new Intl.DateTimeFormat(undefined, { dateStyle: "full", timeStyle: "short" }).format(date);
  }

  async function request(method, values = {}) {
    const url = new URL("/api/manage-appointment", location.origin);
    url.searchParams.set("appointmentId", appointmentId);
    url.searchParams.set("access", access);
    Object.entries(values).forEach(([key, value]) => url.searchParams.set(key, value));
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: method === "POST" ? JSON.stringify({ appointmentId, access, ...values }) : undefined
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.error || "We couldn't update this booking.");
    return data;
  }

  async function submitAction(action, values, successText) {
    if (mutationInProgress) return;
    mutationInProgress = true;
    pendingActionId ||= crypto.randomUUID();
    changeButton.disabled = true;
    cancelButton.disabled = true;
    status.className = "manage-status";
    status.textContent = "Updating your booking...";
    try {
      const result = await request("POST", { action, ...values, actionId: pendingActionId });
      pendingActionId = "";
      status.className = "manage-status";
      status.textContent = result.email?.deliveryStatus === "failed"
        ? `${successText} The confirmation email could not be accepted for delivery. Please contact Finbar to confirm the change.`
        : result.accepted
        ? `${successText} The email request was accepted for processing; delivery is not yet confirmed.`
        : result.email?.sent
          ? `${successText} A confirmation email is on its way.`
          : `${successText} Finbar will confirm the details by email.`;
      return result;
    } catch (error) {
      showError(error);
      throw error;
    } finally {
      mutationInProgress = false;
    }
  }

  function showError(error) {
    status.className = "manage-status manage-error";
    status.textContent = error.message || String(error);
  }

  async function load() {
    if (!appointmentId || !access) throw new Error("This appointment link is incomplete. Open the link from your booking email or contact Finbar.");
    const data = await request("GET");
    appointment = data.appointment;
    lateWindow = data.lateWindow === true;
    const policy = document.getElementById("managePolicy");
    document.getElementById("manageIntro").textContent = appointment.status === "Scheduled"
      ? "Review your appointment details and the available options below."
      : `This appointment is ${appointment.status.toLowerCase()}.`;
    meta.innerHTML = `<strong>${escapeHtml(appointment.subject)}</strong><span>${escapeHtml(formatDate(appointment.datetime))}</span><span>${escapeHtml(appointment.status)}</span>${data.expiresAt ? `<span>Lesson entitlement expires ${escapeHtml(formatDate(data.expiresAt))}</span>` : ""}`;
    changeButton.disabled = data.canReschedule !== true;
    cancelButton.disabled = data.canCancel !== true;
    if (data.canReschedule !== true) panel.classList.add("hidden");
    policy.classList.add("hidden");
    if (lateWindow) {
      policy.textContent = "This lesson starts within 12 hours. Finbar's policy requires a 50% refund for a late change, so please contact him to make sure the refund and package balance are handled correctly.";
      policy.classList.remove("hidden");
    } else if (data.cancelNeedsReview) {
      policy.textContent = "To cancel this paid lesson, contact Finbar so the payment and any refund can be reviewed together. You can still choose a new time above.";
      policy.classList.remove("hidden");
    } else if (appointment.status === "Scheduled" && !data.canReschedule) {
      policy.textContent = "This lesson has started or its details need review. Contact Finbar for help with any change.";
      policy.classList.remove("hidden");
    }
  }

  changeButton.addEventListener("click", () => panel.classList.toggle("hidden"));
  document.getElementById("showTimesBtn").addEventListener("click", async () => {
    status.className = "manage-status";
    status.textContent = "Loading available times...";
    timeSelect.classList.add("hidden");
    timeLabel.classList.add("hidden");
    confirmButton.classList.add("hidden");
    try {
      if (!dateInput.value) throw new Error("Choose a date first.");
      const data = await request("GET", { date: dateInput.value });
      timeSelect.innerHTML = data.times.map((slot) => {
        const value = typeof slot === "string" ? slot : (slot.datetime || slot.time);
        const label = typeof slot === "string" ? formatDate(slot) : (slot.timeLabel || slot.formattedTime || formatDate(value));
        return `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`;
      }).join("");
      if (!data.times.length) throw new Error(data.expiresAt ? "No available times before this lesson entitlement expires." : "No available times on this date. Choose another date.");
      timeLabel.classList.remove("hidden");
      timeSelect.classList.remove("hidden");
      confirmButton.classList.remove("hidden");
      status.textContent = "Choose an available time, then confirm.";
    } catch (error) { showError(error); }
  });
  confirmButton.addEventListener("click", async () => {
    try {
      await submitAction("reschedule", { datetime: timeSelect.value }, "Your lesson was rescheduled.");
      panel.classList.add("hidden");
      try { await load(); } catch {
        changeButton.disabled = true;
        cancelButton.disabled = true;
        status.textContent += " Refresh this page to check the latest options before making another change.";
      }
    } catch (error) { showError(error); }
  });
  cancelButton.addEventListener("click", async () => {
    if (!window.confirm("Cancel this lesson? Please check the cancellation policy before confirming.")) return;
    try {
      await submitAction("cancel", {}, "Your lesson was canceled.");
      panel.classList.add("hidden");
      try { await load(); } catch {
        changeButton.disabled = true;
        cancelButton.disabled = true;
        status.textContent += " Refresh this page to confirm the latest booking status.";
      }
    } catch (error) { showError(error); }
  });

  load().catch(showError);
})();
