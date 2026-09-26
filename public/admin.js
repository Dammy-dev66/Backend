(() => {
  const BOOKING_API = "/api/booking-config";
  const COUPON_API = "/api/admin/coupons";
  const OPERATIONS_API = "/api/admin/coupons?resource=operations";
  const CLIENT_API = "/api/admin/coupons?resource=client";
  const APPOINTMENT_API = "/api/admin/coupons?resource=appointment";
  const TEMPLATE_API = "/api/admin/coupons?resource=templates";

  const adminKeyInput = document.getElementById("adminKeyField");
  const tabButtons = Array.from(document.querySelectorAll(".admin-tab"));
  const tabPanels = Array.from(document.querySelectorAll(".admin-tab-panel"));
  const subjectList = document.getElementById("subjectList");
  const serviceList = document.getElementById("serviceList");
  const packageList = document.getElementById("packageList");
  const couponList = document.getElementById("couponList");
  const adminError = document.getElementById("adminError");
  const adminStatus = document.getElementById("adminStatus");
  const refreshBtn = document.getElementById("refreshBtn");
  const addSubjectBtn = document.getElementById("addSubjectBtn");
  const addServiceBtn = document.getElementById("addServiceBtn");
  const addCouponBtn = document.getElementById("addCouponBtn");
  const saveBtn = document.getElementById("saveBtn");
  const deleteSubjectBtn = document.getElementById("deleteSubjectBtn");
  const deleteServiceBtn = document.getElementById("deleteServiceBtn");
  const deleteCouponBtn = document.getElementById("deleteCouponBtn");
  const subjectSearchInput = document.getElementById("subjectSearchInput");
  const serviceSearchInput = document.getElementById("serviceSearchInput");
  const couponSearchInput = document.getElementById("couponSearchInput");
  const subjectStatus = document.getElementById("subjectStatus");
  const serviceStatus = document.getElementById("serviceStatus");
  const couponStatus = document.getElementById("couponStatus");
  const operationsSummary = document.getElementById("operationsSummary");
  const operationsList = document.getElementById("operationsList");
  const clientDrawer = document.getElementById("clientDrawer");
  const operationSearchInput = document.getElementById("operationSearchInput");
  const refreshOperationsBtn = document.getElementById("refreshOperationsBtn");
  const templateList = document.getElementById("templateList");
  const templateEditorTitle = document.getElementById("templateEditorTitle");
  const templateSubjectInput = document.getElementById("templateSubjectInput");
  const templateHeadingInput = document.getElementById("templateHeadingInput");
  const templateMessageInput = document.getElementById("templateMessageInput");
  const templateCtaInput = document.getElementById("templateCtaInput");
  const templateNoteInput = document.getElementById("templateNoteInput");
  const saveTemplateBtn = document.getElementById("saveTemplateBtn");
  const resetTemplateBtn = document.getElementById("resetTemplateBtn");
  const emailPreview = document.getElementById("emailPreview");

  const subjectNameInput = document.getElementById("subjectNameInput");
  const subjectSlugInput = document.getElementById("subjectSlugInput");
  const subjectLabelInput = document.getElementById("subjectLabelInput");
  const subjectOrderInput = document.getElementById("subjectOrderInput");
  const subjectActiveInput = document.getElementById("subjectActiveInput");
  const subjectNoteInput = document.getElementById("subjectNoteInput");

  const serviceSubjectInput = document.getElementById("serviceSubjectInput");
  const serviceFormatInput = document.getElementById("serviceFormatInput");
  const serviceTierInput = document.getElementById("serviceTierInput");
  const serviceLabelInput = document.getElementById("serviceLabelInput");
  const serviceAppointmentTypeInput = document.getElementById("serviceAppointmentTypeInput");
  const serviceProductInput = document.getElementById("serviceProductInput");
  const serviceCalendarInput = document.getElementById("serviceCalendarInput");
  const serviceLinkInput = document.getElementById("serviceLinkInput");
  const serviceActiveInput = document.getElementById("serviceActiveInput");
  const serviceNoteInput = document.getElementById("serviceNoteInput");

  const codeInput = document.getElementById("codeInput");
  const percentInput = document.getElementById("percentInput");
  const labelInput = document.getElementById("labelInput");
  const messageInput = document.getElementById("messageInput");
  const activeInput = document.getElementById("activeInput");

  const state = {
    tab: "operations",
    subjects: [],
    services: [],
    coupons: [],
    packageCatalog: [],
    selectedSubjectId: "",
    selectedServiceId: "",
    selectedCouponCode: "",
    operations: [],
    operationsSummary: {},
    selectedClientEmail: "",
    templates: {},
    defaults: {},
    selectedTemplateKind: "package",
    search: {
      subjects: "",
      services: "",
      coupons: ""
    }
  };

  function newId(prefix) {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return `${prefix}-${window.crypto.randomUUID()}`;
    }
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function getAdminKey() {
    return adminKeyInput.value.trim() || sessionStorage.getItem("finbarAdminKey") || "";
  }

  function setAdminKey(value) {
    sessionStorage.setItem("finbarAdminKey", value);
  }

  function showError(message) {
    adminError.textContent = message;
    adminError.classList.toggle("hidden", !message);
  }

  function showStatus(message) {
    adminStatus.textContent = message || "";
  }

  function currentSubject() {
    return state.subjects.find((item) => item.id === state.selectedSubjectId) || null;
  }

  function currentService() {
    return state.services.find((item) => item.id === state.selectedServiceId) || null;
  }

  function currentCoupon() {
    return state.coupons.find((item) => item.code === state.selectedCouponCode) || null;
  }

  function setTab(tab) {
    state.tab = tab;
    tabButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.tab === tab));
    tabPanels.forEach((panel) => panel.classList.toggle("hidden", panel.dataset.panel !== tab));
    if (getAdminKey() && tab === "operations") loadOperations().catch((error) => showError(error.message));
    if (getAdminKey() && tab === "templates") loadTemplates().catch((error) => showError(error.message));
  }

  function renderPackageList() {
    packageList.innerHTML = state.packageCatalog.map((item) => `
      <label class="package-check">
        <input type="checkbox" value="${item.key}">
        <span>${item.label}</span>
      </label>
    `).join("");
  }

  function subjectDisplay(subject) {
    return subject.label || subject.name || "Untitled subject";
  }

  function serviceDisplay(service) {
    const format = service.format === "oneToTwo" ? "Tutor + two students" : "Tutor + one student";
    const tier = service.tier === "trial"
      ? "Trial class"
      : service.tier === "single"
        ? "Single lesson"
        : service.tier === "pack6"
          ? "6-class package"
          : "12-class package";
    return service.label || `${format} - ${tier}`;
  }

  function copySubject(subject) {
    return {
      id: subject?.id || newId("subject"),
      name: subject?.name || "",
      slug: subject?.slug || "",
      label: subject?.label || "",
      note: subject?.note || "",
      order: Number.isFinite(Number(subject?.order)) ? Number(subject.order) : 1,
      active: subject?.active !== false
    };
  }

  function copyService(service) {
    return {
      id: service?.id || newId("service"),
      subjectId: service?.subjectId || "",
      format: service?.format || "oneToOne",
      tier: service?.tier || "trial",
      label: service?.label || "",
      appointmentTypeID: service?.appointmentTypeID || "",
      productID: service?.productID || "",
      calendarID: service?.calendarID || "",
      bookingLink: service?.bookingLink || "",
      note: service?.note || "",
      order: Number.isFinite(Number(service?.order)) ? Number(service.order) : 1,
      active: service?.active !== false
    };
  }

  function copyCoupon(coupon) {
    return {
      code: coupon?.code || "",
      percent: Number(coupon?.percent || 10),
      label: coupon?.label || "",
      message: coupon?.message || "",
      active: coupon?.active !== false,
      packageKeys: Array.isArray(coupon?.packageKeys) ? [...coupon.packageKeys] : state.packageCatalog.map((item) => item.key)
    };
  }

  function fillSubjectEditor(subject) {
    const record = copySubject(subject);
    subjectNameInput.value = record.name;
    subjectLabelInput.value = record.label;
    subjectActiveInput.checked = record.active !== false;
    subjectSlugInput.value = record.slug;
    subjectOrderInput.value = record.order || "";
    subjectNoteInput.value = record.note;
    subjectStatus.textContent = record.id ? (record.active ? "Active" : "Inactive") : "";
  }

  function fillServiceEditor(service) {
    const record = copyService(service);
    serviceSubjectInput.value = record.subjectId || state.subjects[0]?.id || "";
    serviceFormatInput.value = record.format;
    serviceTierInput.value = record.tier;
    serviceLabelInput.value = record.label;
    serviceAppointmentTypeInput.value = record.appointmentTypeID;
    serviceProductInput.value = record.productID;
    serviceCalendarInput.value = record.calendarID;
    serviceLinkInput.value = record.bookingLink;
    serviceActiveInput.checked = record.active !== false;
    serviceNoteInput.value = record.note;
    serviceStatus.textContent = record.id ? (record.appointmentTypeID || record.bookingLink ? "Connected" : "Needs mapping") : "";
  }

  function fillCouponEditor(coupon) {
    const record = copyCoupon(coupon);
    codeInput.value = record.code;
    percentInput.value = record.percent ?? "";
    labelInput.value = record.label;
    messageInput.value = record.message;
    activeInput.checked = record.active !== false;

    const keys = new Set(record.packageKeys || []);
    packageList.querySelectorAll("input[type='checkbox']").forEach((input) => {
      input.checked = keys.has(input.value) || keys.has("*");
    });
    couponStatus.textContent = record.code ? (record.active ? "Active" : "Inactive") : "";
  }

  function renderSubjectList() {
    const query = state.search.subjects.toLowerCase();
    const items = state.subjects
      .slice()
      .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0) || a.name.localeCompare(b.name))
      .filter((subject) => {
        if (!query) return true;
        return [subject.name, subject.slug, subject.label, subject.note]
          .some((value) => String(value || "").toLowerCase().includes(query));
      });

    subjectList.innerHTML = "";
    if (!items.length) {
      subjectList.innerHTML = `<p class="muted">No subjects match your search.</p>`;
      return;
    }

    items.forEach((subject) => {
      const row = document.createElement("button");
      row.type = "button";
      row.className = `record-row${subject.id === state.selectedSubjectId ? " active" : ""}`;
      const serviceCount = state.services.filter((service) => service.subjectId === subject.id).length;
      const mappedCount = state.services.filter((service) => service.subjectId === subject.id && (service.appointmentTypeID || service.bookingLink)).length;
      row.innerHTML = `
        <strong>${subjectDisplay(subject)}</strong>
        <span>${subject.slug || "No slug yet"}${subject.active === false ? " - inactive" : ""}</span>
        <small>${serviceCount} lesson type(s) - ${mappedCount} mapped</small>
      `;
      row.addEventListener("click", () => {
        state.selectedSubjectId = subject.id;
        fillSubjectEditor(subject);
        renderSubjectList();
      });
      subjectList.appendChild(row);
    });
  }

  function renderServiceList() {
    const query = state.search.services.toLowerCase();
    const items = state.services
      .slice()
      .sort((a, b) => {
        const subjectA = state.subjects.find((subject) => subject.id === a.subjectId);
        const subjectB = state.subjects.find((subject) => subject.id === b.subjectId);
        return (Number(subjectA?.order) || 0) - (Number(subjectB?.order) || 0)
          || (subjectA?.name || "").localeCompare(subjectB?.name || "")
          || a.format.localeCompare(b.format)
          || a.tier.localeCompare(b.tier);
      })
      .filter((service) => {
        if (!query) return true;
        const subject = state.subjects.find((item) => item.id === service.subjectId);
        return [subject?.name, service.label, service.appointmentTypeID, service.productID, service.bookingLink, service.note]
          .some((value) => String(value || "").toLowerCase().includes(query));
      });

    serviceList.innerHTML = "";
    if (!items.length) {
      serviceList.innerHTML = `<p class="muted">No lesson types match your search.</p>`;
      return;
    }

    items.forEach((service) => {
      const row = document.createElement("button");
      row.type = "button";
      row.className = `record-row${service.id === state.selectedServiceId ? " active" : ""}`;
      const subject = state.subjects.find((item) => item.id === service.subjectId);
      row.innerHTML = `
        <strong>${subject?.name || "Unlinked subject"} - ${serviceDisplay(service)}</strong>
        <span>${service.format === "oneToTwo" ? "Tutor + two students" : "Tutor + one student"} - ${service.tier}</span>
        <small>${service.appointmentTypeID ? `Acuity ID ${service.appointmentTypeID}` : "Needs Acuity ID"}${service.active === false ? " - inactive" : ""}</small>
      `;
      row.addEventListener("click", () => {
        state.selectedServiceId = service.id;
        fillServiceEditor(service);
        renderServiceList();
      });
      serviceList.appendChild(row);
    });
  }

  function renderCoupons() {
    const query = state.search.coupons.toLowerCase();
    const items = state.coupons.filter((coupon) => {
      if (!query) return true;
      return [coupon.code, coupon.label, coupon.message, (coupon.packageKeys || []).join(", ")]
        .some((value) => String(value || "").toLowerCase().includes(query));
    });

    couponList.innerHTML = "";
    if (!items.length) {
      couponList.innerHTML = `<p class="muted">No coupons match your search.</p>`;
      return;
    }

    items.forEach((coupon) => {
      const row = document.createElement("button");
      row.type = "button";
      row.className = `coupon-row${coupon.code === state.selectedCouponCode ? " active" : ""}`;
      row.innerHTML = `
        <strong>${coupon.code}</strong>
        <span>${coupon.percent}% off${coupon.active === false ? " - inactive" : ""}</span>
        <small>${coupon.packageKeys.join(", ") || "All packages"}</small>
      `;
      row.addEventListener("click", () => {
        state.selectedCouponCode = coupon.code;
        fillCouponEditor(coupon);
        renderCoupons();
      });
      couponList.appendChild(row);
    });
  }

  function renderServiceSubjectOptions() {
    const current = serviceSubjectInput.value;
    serviceSubjectInput.innerHTML = state.subjects
      .slice()
      .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0) || a.name.localeCompare(b.name))
      .map((subject) => `<option value="${subject.id}">${subjectDisplay(subject)}${subject.active === false ? " (inactive)" : ""}</option>`)
      .join("");

    if (current) {
      serviceSubjectInput.value = current;
    } else if (state.subjects[0]) {
      serviceSubjectInput.value = state.subjects[0].id;
    }
  }

  function selectedPackageKeys() {
    return Array.from(packageList.querySelectorAll("input[type='checkbox']:checked")).map((input) => input.value);
  }

  async function api(method, url, body) {
    const key = getAdminKey();
    if (!key) {
      throw new Error("Enter the admin key first.");
    }

    setAdminKey(key);

    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        "x-finbar-admin-key": key
      },
      body: body ? JSON.stringify(body) : undefined
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      throw new Error(data.error || "Unable to save dashboard settings.");
    }
    return data;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "Time to be confirmed" : new Intl.DateTimeFormat("en-IE", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Dublin" }).format(date);
  }

  function operationBadge(item) {
    if (item.canceled) return "Canceled";
    if (Array.isArray(item.packageRemaining) && item.packageRemaining.length) return `${item.packageRemaining[0]} package lessons left`;
    if (Array.isArray(item.packageCodes) && item.packageCodes.length) return "Package linked";
    return item.status || "Scheduled";
  }

  function renderOperations() {
    const summary = state.operationsSummary || {};
    operationsSummary.innerHTML = [
      ["Today", summary.today || 0],
      ["Upcoming", summary.upcoming || 0],
      ["Recent", summary.recent || 0],
      ["Canceled", summary.canceled || 0]
    ].map(([label, value]) => `<div class="operation-stat"><strong>${value}</strong><span>${label}</span></div>`).join("");

    const query = operationSearchInput.value.trim().toLowerCase();
    const items = state.operations.filter((item) => !query || [item.clientName, item.email, item.subject, item.appointmentTypeName].some((value) => String(value || "").toLowerCase().includes(query)));
    if (!items.length) {
      operationsList.innerHTML = `<p class="muted">No bookings match this view.</p>`;
      return;
    }
    operationsList.innerHTML = items.map((item) => `
      <button type="button" class="operation-row${item.id === state.selectedAppointmentId ? " active" : ""}" data-appointment-id="${escapeHtml(item.id)}" data-client-email="${escapeHtml(item.email)}">
        <span class="operation-row__time">${escapeHtml(formatDate(item.datetime))}</span>
        <strong>${escapeHtml(item.clientName)}</strong>
        <span>${escapeHtml(item.subject)}</span>
        <small>${escapeHtml(item.email)}</small>
        <em>${escapeHtml(operationBadge(item))}</em>
      </button>
    `).join("");
    operationsList.querySelectorAll("[data-appointment-id]").forEach((button) => button.addEventListener("click", () => {
      state.selectedAppointmentId = button.dataset.appointmentId;
      state.selectedClientEmail = button.dataset.clientEmail;
      renderOperations();
      loadClient(button.dataset.clientEmail).catch((error) => showError(error.message));
    }));
  }

  async function loadOperations() {
    const data = await api("GET", OPERATIONS_API);
    state.operations = data.appointments || [];
    state.operationsSummary = data.summary || {};
    renderOperations();
  }

  function selectedClientAppointment(client) {
    return (client.appointments || []).find((item) => item.id === state.selectedAppointmentId) || client.appointments?.[0] || null;
  }

  function renderClientDrawer(client) {
    const appointment = selectedClientAppointment(client);
    if (!appointment) {
      clientDrawer.innerHTML = `<div class="drawer-empty">No appointment details are available for this client.</div>`;
      return;
    }
    const packages = client.packages || [];
    const receipts = client.receipts || [];
    const actions = client.actions || [];
    clientDrawer.innerHTML = `
      <div class="drawer-head"><div><span class="eyebrow">Client record</span><h3>${escapeHtml(appointment.clientName)}</h3><a href="mailto:${escapeHtml(client.email)}">${escapeHtml(client.email)}</a></div><button type="button" class="drawer-close" aria-label="Close client details">×</button></div>
      <div class="client-booking"><strong>${escapeHtml(appointment.subject)}</strong><span>${escapeHtml(formatDate(appointment.datetime))}</span><small>${escapeHtml(appointment.status)}</small></div>
      <section class="drawer-section"><h4>Client bookings</h4>${(client.appointments || []).map((item) => `<button class="client-appointment${item.id === appointment.id ? " active" : ""}" type="button" data-client-appointment="${escapeHtml(item.id)}"><strong>${escapeHtml(item.subject)}</strong><span>${escapeHtml(formatDate(item.datetime))}</span><small>${escapeHtml(item.status)}</small></button>`).join("")}</section>
      <section class="drawer-section"><h4>Package balance</h4>${packages.length ? packages.map((item) => `<div class="package-balance"><strong>${escapeHtml(item.certificate || "Package code pending")}</strong><span>${Number.isFinite(item.remaining) ? `${item.remaining} lesson${item.remaining === 1 ? "" : "s"} remaining` : "Check completed when this record opened"}</span></div>`).join("") : `<p class="muted">No linked package yet.</p>`}
        <details class="link-package"><summary>Link an older package</summary><div class="link-package__fields"><input id="linkPackageCode" placeholder="Package code"><input id="linkPackageType" placeholder="Appointment type ID" value="${escapeHtml(appointment.appointmentTypeID)}"><button class="btn-secondary" type="button" id="linkPackageBtn">Link package</button></div></details>
      </section>
      <section class="drawer-section"><h4>Booking actions</h4>
        <div class="action-grid"><button class="btn-secondary" type="button" id="resendBookingBtn">Resend email</button><button class="btn-secondary" type="button" id="showRescheduleBtn">Reschedule</button><button class="btn-danger" type="button" id="cancelBookingBtn">Cancel lesson</button></div>
        <div class="reschedule-panel hidden" id="reschedulePanel"><label class="field"><span>New date</span><input id="rescheduleDate" type="date"></label><button class="btn-secondary" id="loadSlotsBtn" type="button">Show available times</button><select id="rescheduleTime" class="hidden"></select><input id="rescheduleNote" class="hidden" placeholder="Optional note for the client"><button class="btn-primary hidden" id="confirmRescheduleBtn" type="button">Confirm reschedule</button></div>
      </section>
      <section class="drawer-section"><h4>Receipt history</h4>${receipts.length ? receipts.slice(0, 5).map((item) => `<p class="timeline-row"><strong>${escapeHtml(item.kind || "Email")}</strong><span>${item.sent ? "Sent" : "Not sent"} · ${escapeHtml(formatDate(item.createdAt))}</span></p>`).join("") : `<p class="muted">No recorded receipt emails yet.</p>`}</section>
      <section class="drawer-section"><h4>Internal action history</h4>${actions.length ? actions.slice(0, 5).map((item) => `<p class="timeline-row"><strong>${escapeHtml(item.type)}</strong><span>${escapeHtml(item.result || "completed")} · ${escapeHtml(item.actor || "Fin")} · ${escapeHtml(formatDate(item.createdAt))}${item.note ? ` · ${escapeHtml(item.note)}` : ""}</span></p>`).join("") : `<p class="muted">No dashboard actions yet.</p>`}</section>
    `;
    clientDrawer.querySelector(".drawer-close").addEventListener("click", () => { state.selectedClientEmail = ""; state.selectedAppointmentId = ""; clientDrawer.innerHTML = `<div class="drawer-empty">Select a booking to view the client, package balance, receipt history, and actions.</div>`; renderOperations(); });
    clientDrawer.querySelectorAll("[data-client-appointment]").forEach((button) => button.addEventListener("click", () => { state.selectedAppointmentId = button.dataset.clientAppointment; renderClientDrawer(client); renderOperations(); }));
    clientDrawer.querySelector("#linkPackageBtn").addEventListener("click", async () => {
      const certificate = clientDrawer.querySelector("#linkPackageCode").value.trim();
      const appointmentTypeID = clientDrawer.querySelector("#linkPackageType").value.trim();
      await api("POST", CLIENT_API, { email: client.email, certificate, appointmentTypeID, subject: appointment.subject, format: appointment.format, tier: appointment.tier });
      showStatus("Package linked. Its balance will now be checked.");
      await loadClient(client.email);
      await loadOperations();
    });
    clientDrawer.querySelector("#resendBookingBtn").addEventListener("click", () => runAppointmentAction(appointment, "resend").catch((error) => showError(error.message)));
    clientDrawer.querySelector("#showRescheduleBtn").addEventListener("click", () => clientDrawer.querySelector("#reschedulePanel").classList.remove("hidden"));
    clientDrawer.querySelector("#cancelBookingBtn").addEventListener("click", () => {
      const note = window.prompt("Optional note to include in the cancellation email:", "") || "";
      if (window.confirm("Cancel this lesson? This does not issue a refund or restore a package lesson.")) {
        runAppointmentAction(appointment, "cancel", { note }).catch((error) => showError(error.message));
      }
    });
    clientDrawer.querySelector("#loadSlotsBtn").addEventListener("click", () => loadAppointmentSlots(appointment).catch((error) => showError(error.message)));
    clientDrawer.querySelector("#confirmRescheduleBtn").addEventListener("click", () => {
      const datetime = clientDrawer.querySelector("#rescheduleTime").value;
      const note = clientDrawer.querySelector("#rescheduleNote").value.trim();
      if (datetime) runAppointmentAction(appointment, "reschedule", { datetime, calendarID: appointment.calendarID, note }).catch((error) => showError(error.message));
    });
  }

  async function loadClient(email) {
    const data = await api("GET", `${CLIENT_API}&email=${encodeURIComponent(email)}`);
    renderClientDrawer(data);
  }

  async function loadAppointmentSlots(appointment) {
    const date = clientDrawer.querySelector("#rescheduleDate").value;
    if (!date) throw new Error("Choose a new date first.");
    const data = await api("GET", `${APPOINTMENT_API}&id=${encodeURIComponent(appointment.id)}&date=${encodeURIComponent(date)}`);
    const select = clientDrawer.querySelector("#rescheduleTime");
    const slots = data.times || [];
    select.innerHTML = slots.length ? slots.map((slot) => {
      const datetime = slot.datetime || slot.time || slot;
      return `<option value="${escapeHtml(datetime)}">${escapeHtml(formatDate(datetime))}</option>`;
    }).join("") : `<option value="">No times available</option>`;
    select.classList.remove("hidden");
    clientDrawer.querySelector("#rescheduleNote").classList.remove("hidden");
    clientDrawer.querySelector("#confirmRescheduleBtn").classList.toggle("hidden", !slots.length);
  }

  async function runAppointmentAction(appointment, action, extra = {}) {
    const result = await api("POST", APPOINTMENT_API, { action, appointmentId: appointment.id, ...extra });
    showStatus(action === "resend" ? "Customer email resent." : `Booking ${action}d and branded customer email sent.`);
    await loadOperations();
    await loadClient(state.selectedClientEmail);
    return result;
  }

  function templateLabel(kind) {
    return { package: "Package receipt", booking: "Booking confirmation", rescheduled: "Reschedule confirmation", canceled: "Cancellation confirmation" }[kind] || kind;
  }

  function currentTemplate() { return state.templates[state.selectedTemplateKind] || {}; }

  function fillTemplateEditor() {
    const template = currentTemplate();
    templateEditorTitle.textContent = templateLabel(state.selectedTemplateKind);
    templateSubjectInput.value = template.subject || "";
    templateHeadingInput.value = template.heading || "";
    templateMessageInput.value = template.message || "";
    templateCtaInput.value = template.ctaLabel || "";
    templateNoteInput.value = template.extraNote || "";
    renderEmailPreview();
  }

  function renderTemplates() {
    templateList.innerHTML = Object.keys(state.templates).map((kind) => `<button class="record-row${kind === state.selectedTemplateKind ? " active" : ""}" type="button" data-template-kind="${kind}"><strong>${templateLabel(kind)}</strong><span>Customer-facing email</span></button>`).join("");
    templateList.querySelectorAll("[data-template-kind]").forEach((button) => button.addEventListener("click", () => { state.selectedTemplateKind = button.dataset.templateKind; renderTemplates(); fillTemplateEditor(); }));
  }

  function renderEmailPreview() {
    const values = { recipientName: "Jordan", subject: "English Literature", bookingDate: "Tuesday, 30 September at 16:00", packageCode: "AB12CD34", actionNote: "Please contact Fin if you have any questions." };
    const interpolate = (value) => String(value || "").replace(/\{(\w+)\}/g, (_, key) => values[key] || "");
    emailPreview.innerHTML = `<p class="eyebrow">Customer preview</p><h3>${escapeHtml(interpolate(templateHeadingInput.value))}</h3><p>${escapeHtml(interpolate(templateMessageInput.value))}</p><div class="email-preview__code">Package code<br><strong>${values.packageCode}</strong></div><button type="button">${escapeHtml(interpolate(templateCtaInput.value))}</button><p class="email-preview__note">${escapeHtml(interpolate(templateNoteInput.value))}</p>`;
  }

  async function loadTemplates() {
    const data = await api("GET", TEMPLATE_API);
    state.templates = data.templates || {};
    state.defaults = data.defaults || {};
    if (!state.templates[state.selectedTemplateKind]) state.selectedTemplateKind = Object.keys(state.templates)[0] || "package";
    renderTemplates();
    fillTemplateEditor();
  }

  function buildSubjectPayload() {
    const edited = copySubject(currentSubject());
    edited.name = subjectNameInput.value.trim();
    edited.label = subjectLabelInput.value.trim();
    edited.active = subjectActiveInput.checked;
    edited.slug = subjectSlugInput.value.trim();
    edited.order = Number(subjectOrderInput.value || 0) || 1;
    edited.note = subjectNoteInput.value.trim();
    if (!edited.slug && edited.name) {
      edited.slug = edited.name.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    }
    return edited;
  }

  function buildServicePayload() {
    const edited = copyService(currentService());
    edited.subjectId = serviceSubjectInput.value;
    edited.format = serviceFormatInput.value;
    edited.tier = serviceTierInput.value;
    edited.label = serviceLabelInput.value.trim();
    edited.appointmentTypeID = serviceAppointmentTypeInput.value.trim();
    edited.productID = serviceProductInput.value.trim();
    edited.calendarID = serviceCalendarInput.value.trim();
    edited.bookingLink = serviceLinkInput.value.trim();
    edited.active = serviceActiveInput.checked;
    edited.note = serviceNoteInput.value.trim();
    return edited;
  }

  function buildCouponPayload() {
    const edited = copyCoupon(currentCoupon());
    edited.code = codeInput.value.trim();
    edited.percent = Number(percentInput.value);
    edited.label = labelInput.value.trim();
    edited.message = messageInput.value.trim();
    edited.active = activeInput.checked;
    edited.packageKeys = selectedPackageKeys();
    return edited;
  }

  async function load() {
    showError("");
    showStatus("Loading...");

    const [bookingData, couponData] = await Promise.all([
      api("GET", BOOKING_API),
      api("GET", COUPON_API)
    ]);

    state.subjects = bookingData.subjects || [];
    state.services = bookingData.services || [];
    state.packageCatalog = bookingData.packageCatalog || couponData.packageCatalog || [];
    state.coupons = couponData.coupons || [];

    if (!state.selectedSubjectId && state.subjects[0]) {
      state.selectedSubjectId = state.subjects[0].id;
    }
    if (!state.selectedServiceId && state.services[0]) {
      state.selectedServiceId = state.services[0].id;
    }
    if (!state.selectedCouponCode && state.coupons[0]) {
      state.selectedCouponCode = state.coupons[0].code;
    }

    renderPackageList();
    renderServiceSubjectOptions();
    fillSubjectEditor(currentSubject() || state.subjects[0] || {});
    fillServiceEditor(currentService() || state.services[0] || {});
    fillCouponEditor(currentCoupon() || state.coupons[0] || {});
    renderSubjectList();
    renderServiceList();
    renderCoupons();
    showStatus(`Loaded ${state.subjects.length} subjects, ${state.services.length} lesson types, and ${state.coupons.length} coupon(s).`);
  }

  function ensureSelectedAfterAdd(collection, item, idKey) {
    collection.unshift(item);
    state[idKey] = item.id || item.code;
  }

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => setTab(button.dataset.tab));
  });

  refreshBtn.addEventListener("click", () => Promise.all([load(), loadOperations()]).catch((error) => showError(error.message)));

  addSubjectBtn.addEventListener("click", () => {
    setTab("subjects");
    const subject = copySubject({
      id: newId("subject"),
      name: "New subject",
      slug: "new-subject",
      label: "New subject",
      order: state.subjects.length + 1,
      active: true
    });
    ensureSelectedAfterAdd(state.subjects, subject, "selectedSubjectId");
    renderServiceSubjectOptions();
    fillSubjectEditor(subject);
    renderSubjectList();
  });

  addServiceBtn.addEventListener("click", () => {
    setTab("services");
    const fallbackSubject = currentSubject() || state.subjects[0] || { id: "", name: "" };
    const service = copyService({
      id: newId("service"),
      subjectId: fallbackSubject.id,
      format: "oneToOne",
      tier: "trial",
      label: "Tutor + one student - Trial class",
      calendarID: "14289294",
      active: true
    });
    ensureSelectedAfterAdd(state.services, service, "selectedServiceId");
    fillServiceEditor(service);
    renderServiceSubjectOptions();
    renderServiceList();
  });

  addCouponBtn.addEventListener("click", () => {
    setTab("coupons");
    const coupon = copyCoupon({
      code: "",
      percent: 10,
      label: "",
      message: "",
      active: true,
      packageKeys: state.packageCatalog.map((item) => item.key)
    });
    state.coupons.unshift(coupon);
    state.selectedCouponCode = "";
    fillCouponEditor(coupon);
    renderCoupons();
  });

  deleteSubjectBtn.addEventListener("click", () => {
    if (!state.selectedSubjectId) return;
    state.subjects = state.subjects.filter((subject) => subject.id !== state.selectedSubjectId);
    state.services = state.services.filter((service) => service.subjectId !== state.selectedSubjectId);
    state.selectedSubjectId = state.subjects[0]?.id || "";
    state.selectedServiceId = state.services[0]?.id || "";
    renderServiceSubjectOptions();
    renderSubjectList();
    renderServiceList();
    fillSubjectEditor(currentSubject() || {});
    fillServiceEditor(currentService() || {});
  });

  deleteServiceBtn.addEventListener("click", () => {
    if (!state.selectedServiceId) return;
    state.services = state.services.filter((service) => service.id !== state.selectedServiceId);
    state.selectedServiceId = state.services[0]?.id || "";
    renderServiceList();
    fillServiceEditor(currentService() || {});
  });

  deleteCouponBtn.addEventListener("click", () => {
    const coupon = currentCoupon();
    if (!coupon) return;
    state.coupons = state.coupons.filter((item) => item.code !== coupon.code);
    state.selectedCouponCode = state.coupons[0]?.code || "";
    renderCoupons();
    fillCouponEditor(currentCoupon() || {});
  });

  saveBtn.addEventListener("click", async () => {
    showError("");
    try {
      const subject = buildSubjectPayload();
      const service = buildServicePayload();
      const coupon = buildCouponPayload();

      if (subject.name) {
        const index = state.subjects.findIndex((item) => item.id === subject.id);
        if (index >= 0) state.subjects[index] = subject;
        else state.subjects.unshift(subject);
        state.selectedSubjectId = subject.id;
      }

      if (service.subjectId && service.format && service.tier) {
        const index = state.services.findIndex((item) => item.id === service.id);
        if (index >= 0) state.services[index] = service;
        else state.services.unshift(service);
        state.selectedServiceId = service.id;
      }

      if (coupon.code && Number.isFinite(coupon.percent) && coupon.percent > 0) {
        coupon.code = coupon.code.toUpperCase();
        coupon.percent = Math.max(1, Math.min(100, Math.round(coupon.percent)));
        coupon.packageKeys = coupon.packageKeys.length ? coupon.packageKeys : state.packageCatalog.map((item) => item.key);
        const originalCode = state.selectedCouponCode ? state.selectedCouponCode.toUpperCase() : "";
        const index = state.coupons.findIndex((item) => item.code === originalCode || item.code === coupon.code);
        if (index >= 0) state.coupons[index] = coupon;
        else state.coupons.unshift(coupon);
        state.selectedCouponCode = coupon.code;
      }

      const [bookingResult, couponResult] = await Promise.all([
        api("PUT", BOOKING_API, {
          version: 1,
          subjects: state.subjects,
          services: state.services
        }),
        api("PUT", COUPON_API, {
          coupons: state.coupons
        })
      ]);

      state.subjects = bookingResult.subjects || state.subjects;
      state.services = bookingResult.services || state.services;
      state.packageCatalog = bookingResult.packageCatalog || state.packageCatalog;
      state.coupons = couponResult.coupons || state.coupons;

      renderPackageList();
      renderServiceSubjectOptions();
      renderSubjectList();
      renderServiceList();
      renderCoupons();
      fillSubjectEditor(currentSubject() || state.subjects[0] || {});
      fillServiceEditor(currentService() || state.services[0] || {});
      fillCouponEditor(currentCoupon() || state.coupons[0] || {});
      showStatus("Dashboard settings saved.");
    } catch (error) {
      showError(error.message);
    }
  });

  subjectSearchInput.addEventListener("input", () => {
    state.search.subjects = subjectSearchInput.value.trim();
    renderSubjectList();
  });

  serviceSearchInput.addEventListener("input", () => {
    state.search.services = serviceSearchInput.value.trim();
    renderServiceList();
  });

  couponSearchInput.addEventListener("input", () => {
    state.search.coupons = couponSearchInput.value.trim();
    renderCoupons();
  });

  [subjectNameInput, subjectLabelInput, subjectActiveInput, subjectSlugInput, subjectOrderInput, subjectNoteInput].forEach((input) => {
    input.addEventListener("input", () => {
      const subject = buildSubjectPayload();
      subjectStatus.textContent = subject.active ? "Active" : "Inactive";
    });
  });

  [serviceSubjectInput, serviceFormatInput, serviceTierInput, serviceLabelInput, serviceAppointmentTypeInput, serviceProductInput, serviceCalendarInput, serviceLinkInput, serviceActiveInput, serviceNoteInput].forEach((input) => {
    input.addEventListener("input", () => {
      const service = buildServicePayload();
      serviceStatus.textContent = service.appointmentTypeID || service.bookingLink ? "Connected" : "Needs mapping";
      renderServiceList();
    });
    input.addEventListener("change", () => {
      const service = buildServicePayload();
      serviceStatus.textContent = service.appointmentTypeID || service.bookingLink ? "Connected" : "Needs mapping";
      renderServiceList();
    });
  });

  [codeInput, percentInput, labelInput, messageInput, activeInput].forEach((input) => {
    input.addEventListener("input", () => {
      const coupon = buildCouponPayload();
      couponStatus.textContent = coupon.code ? (coupon.active ? "Active" : "Inactive") : "";
    });
  });

  operationSearchInput.addEventListener("input", renderOperations);
  refreshOperationsBtn.addEventListener("click", () => loadOperations().catch((error) => showError(error.message)));

  [templateSubjectInput, templateHeadingInput, templateMessageInput, templateCtaInput, templateNoteInput].forEach((input) => input.addEventListener("input", renderEmailPreview));
  saveTemplateBtn.addEventListener("click", async () => {
    const templates = { ...state.templates, [state.selectedTemplateKind]: {
      subject: templateSubjectInput.value.trim(),
      heading: templateHeadingInput.value.trim(),
      message: templateMessageInput.value.trim(),
      ctaLabel: templateCtaInput.value.trim(),
      extraNote: templateNoteInput.value.trim()
    } };
    const data = await api("PUT", TEMPLATE_API, { version: 1, templates });
    state.templates = data.templates || templates;
    showStatus("Email template saved. Future customer emails will use this wording.");
    renderTemplates();
    fillTemplateEditor();
  });
  resetTemplateBtn.addEventListener("click", async () => {
    if (!window.confirm("Reset this email template to Finbar's default wording?")) return;
    const data = await api("POST", TEMPLATE_API, { kind: state.selectedTemplateKind });
    state.templates = data.templates || state.templates;
    showStatus("Email template restored to the default wording.");
    renderTemplates();
    fillTemplateEditor();
  });

  adminKeyInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      Promise.all([load(), loadOperations()]).catch((error) => showError(error.message));
    }
  });

  setTab("operations");
  load().catch((error) => {
    showStatus("");
    showError(error.message);
  });
})();
