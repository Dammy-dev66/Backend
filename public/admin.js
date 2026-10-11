(() => {
  const ADMIN_IDLE_TIMEOUT_MS = 30 * 60 * 1000;
  const ADMIN_LAST_ACTIVITY_KEY = "finbarAdminLastActivity";
  const storedKey = sessionStorage.getItem("finbarAdminKey");
  const lastActivity = Number(sessionStorage.getItem(ADMIN_LAST_ACTIVITY_KEY));

  if (!storedKey || !Number.isFinite(lastActivity) || Date.now() - lastActivity >= ADMIN_IDLE_TIMEOUT_MS) {
    sessionStorage.removeItem("finbarAdminKey");
    sessionStorage.removeItem(ADMIN_LAST_ACTIVITY_KEY);
    window.location.replace("/admin-login.html?reason=expired");
    return;
  }

  function markAdminActivity() {
    if (sessionStorage.getItem("finbarAdminKey")) {
      sessionStorage.setItem(ADMIN_LAST_ACTIVITY_KEY, String(Date.now()));
    }
  }

  ["pointerdown", "keydown", "touchstart", "scroll"].forEach((eventName) => {
    document.addEventListener(eventName, markAdminActivity, { passive: true });
  });

  window.setInterval(() => {
    const lastActive = Number(sessionStorage.getItem(ADMIN_LAST_ACTIVITY_KEY));
    if (!Number.isFinite(lastActive) || Date.now() - lastActive >= ADMIN_IDLE_TIMEOUT_MS) {
      sessionStorage.removeItem("finbarAdminKey");
      sessionStorage.removeItem(ADMIN_LAST_ACTIVITY_KEY);
      window.location.replace("/admin-login.html?reason=expired");
    }
  }, 60 * 1000);

  const BOOKING_API = "/api/booking-config";
  const COUPON_API = "/api/admin/coupons";
  const OPERATIONS_API = "/api/admin/coupons?resource=operations";
  const CLIENT_API = "/api/admin/coupons?resource=client";
  const APPOINTMENT_API = "/api/admin/coupons?resource=appointment";
  const RECEIPT_API = "/api/admin/coupons?resource=receipt";
  const TEMPLATE_API = "/api/admin/coupons?resource=templates";
  const PROOF_TEMPLATE_API = "/api/admin/coupons?resource=proofreading-templates";
  const PRICING_API = "/api/admin/coupons?resource=pricing";

  const tabButtons = Array.from(document.querySelectorAll(".admin-tab"));
  const tabPanels = Array.from(document.querySelectorAll(".admin-tab-panel"));
  const subjectList = document.getElementById("subjectList");
  const serviceList = document.getElementById("serviceList");
  const packageList = document.getElementById("packageList");
  const couponList = document.getElementById("couponList");
  const adminError = document.getElementById("adminError");
  const adminStatus = document.getElementById("adminStatus");
  const refreshBtn = document.getElementById("refreshBtn");
  const backupDownloadBtn = document.getElementById("backupDownloadBtn");
  const backupRestoreFile = document.getElementById("backupRestoreFile");
  const backupRestoreSection = document.getElementById("backupRestoreSection");
  const backupRestoreBtn = document.getElementById("backupRestoreBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const addSubjectBtn = document.getElementById("addSubjectBtn");
  const addServiceBtn = document.getElementById("addServiceBtn");
  const addCouponBtn = document.getElementById("addCouponBtn");
  const saveBtn = document.getElementById("saveBtn");
  const deleteSubjectBtn = document.getElementById("deleteSubjectBtn");
  const deleteServiceBtn = document.getElementById("deleteServiceBtn");
  const deleteCouponBtn = document.getElementById("deleteCouponBtn");
  const subjectSearchInput = document.getElementById("subjectSearchInput");
  const serviceSearchInput = document.getElementById("serviceSearchInput");
  const serviceSubjectFilter = document.getElementById("serviceSubjectFilter");
  const couponSearchInput = document.getElementById("couponSearchInput");
  const subjectStatus = document.getElementById("subjectStatus");
  const serviceStatus = document.getElementById("serviceStatus");
  const couponStatus = document.getElementById("couponStatus");
  const operationsSummary = document.getElementById("operationsSummary");
  const operationsList = document.getElementById("operationsList");
  const fulfillmentIssues = document.getElementById("fulfillmentIssues");
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
  const proofTemplateList = document.getElementById("proofTemplateList");
  const proofTemplateEditorTitle = document.getElementById("proofTemplateEditorTitle");
  const proofTemplateAudience = document.getElementById("proofTemplateAudience");
  const proofTemplateSubjectInput = document.getElementById("proofTemplateSubjectInput");
  const proofTemplateHeadingInput = document.getElementById("proofTemplateHeadingInput");
  const proofTemplateMessageInput = document.getElementById("proofTemplateMessageInput");
  const proofTemplateCtaInput = document.getElementById("proofTemplateCtaInput");
  const proofTemplateNoteInput = document.getElementById("proofTemplateNoteInput");
  const saveProofTemplateBtn = document.getElementById("saveProofTemplateBtn");
  const resetProofTemplateBtn = document.getElementById("resetProofTemplateBtn");
  const proofEmailPreview = document.getElementById("proofEmailPreview");
  const priceEditorGrid = document.getElementById("priceEditorGrid");
  const pricingReference = document.getElementById("pricingReference");
  const refreshPricingBtn = document.getElementById("refreshPricingBtn");
  const savePricingBtn = document.getElementById("savePricingBtn");
  const priceSubjectSelect = document.getElementById("priceSubjectSelect");
  const priceUseDefaultWrap = document.getElementById("priceUseDefaultWrap");
  const priceUseDefaultInput = document.getElementById("priceUseDefaultInput");
  const popupHeadingInput = document.getElementById("popupHeadingInput");
  const popupPack6Input = document.getElementById("popupPack6Input");
  const popupPack12Input = document.getElementById("popupPack12Input");
  const popupPolicyInput = document.getElementById("popupPolicyInput");
  const dashboardTitle = document.getElementById("dashboardTitle");
  const dashboardKicker = document.getElementById("dashboardKicker");

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
    fulfillmentIssues: [],
    actionIssues: [],
    backfillError: "",
    operationsSyncWarning: "",
    selectedClientEmail: "",
    appointmentActionPending: false,
    templates: {},
    templatesRevision: "",
    defaults: {},
    selectedTemplateKind: "package",
    proofreadingTemplates: {},
    proofreadingRevision: "",
    proofreadingDefaults: {},
    selectedProofreadingTemplateKind: "reviewDocument",
    pricing: { currency: "EUR", prices: {}, subjectPrices: {}, popup: {} },
    pricingServices: [],
    bookingRevision: "",
    couponRevision: "",
    pricingSubjectId: "",
    useDefaultPricing: false,
    search: {
      subjects: "",
      services: "",
      serviceSubjectId: "",
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
    return sessionStorage.getItem("finbarAdminKey") || "";
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
    const selectedTab = tabButtons.find((btn) => btn.dataset.tab === tab);
    tabButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.tab === tab));
    tabPanels.forEach((panel) => panel.classList.toggle("hidden", panel.dataset.panel !== tab));
    if (selectedTab) {
      dashboardTitle.textContent = selectedTab.dataset.title || selectedTab.textContent.trim();
      dashboardKicker.textContent = selectedTab.dataset.kicker || "Booking dashboard";
    }
    saveBtn.classList.toggle("hidden", !["subjects", "services", "coupons"].includes(tab));
    if (getAdminKey() && tab === "operations") loadOperations().catch((error) => showError(error.message));
    if (getAdminKey() && tab === "pricing") loadPricing().catch((error) => showError(error.message));
    if (getAdminKey() && tab === "templates") loadTemplates().catch((error) => showError(error.message));
    if (getAdminKey() && tab === "proofreading-templates") loadProofreadingTemplates().catch((error) => showError(error.message));
  }

  function renderPackageList() {
    packageList.innerHTML = state.packageCatalog.map((item) => `
      <label class="package-check">
        <input type="checkbox" value="${item.key}">
        <span>${item.label}</span>
      </label>
    `).join("");
  }

  function priceLabel(format, tier) {
    const formatLabel = format === "oneToTwo" ? "Tutor + two students" : "Tutor + one student";
    const tierLabel = { trial: "Trial class", single: "Single lesson", pack6: "6-class package", pack12: "12-class package" }[tier] || tier;
    return `${formatLabel} - ${tierLabel}`;
  }

  function renderPricing() {
    state.pricing.prices = state.pricing.prices || {};
    state.pricing.subjectPrices = state.pricing.subjectPrices || {};
    state.pricing.popup = state.pricing.popup || {};
    const options = [`<option value="">Shared defaults</option>`, ...state.subjects.map((subject) => `<option value="${escapeHtml(subject.id)}">${escapeHtml(subject.name)}</option>`)];
    priceSubjectSelect.innerHTML = options.join("");
    if (!state.subjects.some((subject) => subject.id === state.pricingSubjectId)) state.pricingSubjectId = "";
    priceSubjectSelect.value = state.pricingSubjectId;
    const overrides = state.pricing.subjectPrices[state.pricingSubjectId];
    state.useDefaultPricing = Boolean(state.pricingSubjectId && !overrides);
    priceUseDefaultWrap.classList.toggle("hidden", !state.pricingSubjectId);
    priceUseDefaultInput.checked = state.useDefaultPricing;
    const prices = state.pricingSubjectId && overrides ? overrides : state.pricing.prices;
    const keys = ["oneToOne", "oneToTwo"].flatMap((format) => ["trial", "single", "pack6", "pack12"].map((tier) => ({ format, tier })));
    priceEditorGrid.innerHTML = keys.map(({ format, tier }) => `<label class="price-editor-field"><span>${escapeHtml(priceLabel(format, tier))}</span><div><b>EUR</b><input type="number" min="0" max="100000" step="0.01" inputmode="decimal" data-price-format="${format}" data-price-tier="${tier}" value="${Number(prices?.[format]?.[tier] ?? 0).toFixed(2)}"${state.useDefaultPricing ? " disabled" : ""}></div></label>`).join("");
    popupHeadingInput.value = state.pricing.popup.heading || "";
    popupPack6Input.value = state.pricing.popup.packageNotes?.pack6 || "";
    popupPack12Input.value = state.pricing.popup.packageNotes?.pack12 || "";
    popupPolicyInput.value = state.pricing.popup.policyText || "";
    const mapped = state.pricingServices.filter((service) => service.appointmentTypeID);
    const reported = mapped.filter((service) => Number.isFinite(service.acuityPrice));
    const mismatches = reported.filter((service) => service.matchesAcuity === false);
    const selected = state.pricingSubjectId ? mapped.filter((service) => service.subjectId === state.pricingSubjectId) : [];
    pricingReference.innerHTML = `
      <div class="record-editor-head"><strong>Acuity reference</strong><span class="status-pill">${reported.length ? `${mismatches.length} mismatch${mismatches.length === 1 ? "" : "es"}` : "Unavailable"}</span></div>
      <p class="editor-note">Website and Stripe use the prices on the left. Saving here does not change Acuity's appointment-type prices.</p>
      ${state.pricingSubjectId
        ? selected.length
          ? `<div class="pricing-reference-list">${selected.map((service) => `<div><strong>${escapeHtml(priceLabel(service.format, service.tier))}</strong><span>Acuity appointment type ${escapeHtml(service.appointmentTypeID)}</span><em class="${service.matchesAcuity === true ? "matches" : "mismatch"}">${Number.isFinite(service.acuityPrice) ? `Acuity: EUR ${service.acuityPrice.toFixed(2)} · Website: EUR ${Number(service.websitePrice).toFixed(2)}${service.matchesAcuity ? " · Matched" : " · Update in Acuity"}` : "Acuity price unavailable · Check this type in Acuity"}</em></div>`).join("")}</div>`
          : `<p class="muted">No Acuity lesson types are mapped to this subject yet.</p>`
        : `<p class="muted">Select a subject to review its matching Acuity lesson types${mismatches.length ? `; ${mismatches.length} price mismatch${mismatches.length === 1 ? "" : "es"} need attention` : ""}.</p>`}
    `;
  }

  async function loadPricing() {
    const data = await api("GET", PRICING_API);
    state.pricing = data.pricing || state.pricing;
    state.pricing.subjectPrices = state.pricing.subjectPrices || {};
    state.pricingServices = data.services || [];
    renderPricing();
  }

  function readPriceMatrix() {
    const prices = { oneToOne: {}, oneToTwo: {} };
    priceEditorGrid.querySelectorAll("[data-price-format]").forEach((input) => {
      if (input.value.trim() === "") {
        throw new Error(`Enter a price for ${priceLabel(input.dataset.priceFormat, input.dataset.priceTier)}.`);
      }
      const amount = Number(input.value);
      if (!Number.isFinite(amount) || amount < 0 || amount > 100000 || Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-6) {
        throw new Error(`Enter a valid price for ${priceLabel(input.dataset.priceFormat, input.dataset.priceTier)}.`);
      }
      prices[input.dataset.priceFormat][input.dataset.priceTier] = Math.round(amount * 100) / 100;
    });
    return prices;
  }

  function capturePricingEditor() {
    const matrix = readPriceMatrix();
    state.pricing.popup = {
      ...(state.pricing.popup || {}),
      heading: popupHeadingInput.value.trim(),
      packageNotes: { pack6: popupPack6Input.value.trim(), pack12: popupPack12Input.value.trim() },
      policyText: popupPolicyInput.value.trim()
    };
    if (state.pricingSubjectId && state.useDefaultPricing) {
      delete state.pricing.subjectPrices[state.pricingSubjectId];
    } else if (state.pricingSubjectId) {
      state.pricing.subjectPrices[state.pricingSubjectId] = matrix;
    } else {
      state.pricing.prices = matrix;
    }
    return matrix;
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
    serviceStatus.textContent = record.id ? serviceConnectionStatus(record) : "";
  }

  function serviceConnectionStatus(service) {
    if (service.appointmentTypeID) return "Connected";
    if (service.bookingLink) return "External link only - not price-connected";
    return "Needs Acuity mapping";
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
      const mappedCount = state.services.filter((service) => service.subjectId === subject.id && service.appointmentTypeID).length;
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
    const subjectFilter = state.search.serviceSubjectId;
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
        if (subjectFilter && service.subjectId !== subjectFilter) return false;
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

    const groups = new Map();
    items.forEach((service) => {
      const subject = state.subjects.find((item) => item.id === service.subjectId);
      const subjectName = subject?.name || "Unlinked subject";
      if (!groups.has(subjectName)) groups.set(subjectName, []);
      groups.get(subjectName).push(service);
    });

    groups.forEach((services, subjectName) => {
      const group = document.createElement("details");
      group.className = "service-group";
      group.open = Boolean(query || subjectFilter || services.some((service) => service.id === state.selectedServiceId));

      const summary = document.createElement("summary");
      const title = document.createElement("strong");
      title.textContent = subjectName;
      const count = document.createElement("span");
      const mappedCount = services.filter((service) => service.appointmentTypeID).length;
      count.textContent = `${mappedCount}/${services.length} mapped`;
      summary.append(title, count);

      const rows = document.createElement("div");
      rows.className = "service-group__rows";
      services.forEach((service) => {
        const row = document.createElement("button");
        row.type = "button";
        row.className = `record-row${service.id === state.selectedServiceId ? " active" : ""}`;
        const label = document.createElement("strong");
        label.textContent = serviceDisplay(service);
        const detail = document.createElement("span");
        detail.textContent = `${service.format === "oneToTwo" ? "Tutor + two students" : "Tutor + one student"} - ${service.tier}`;
        const mapping = document.createElement("small");
        mapping.textContent = `${service.appointmentTypeID ? `Acuity ID ${service.appointmentTypeID}` : service.bookingLink ? "External link only - not price-connected" : "Needs Acuity ID"}${service.active === false ? " - inactive" : ""}`;
        row.append(label, detail, mapping);
        row.addEventListener("click", () => {
          state.selectedServiceId = service.id;
          fillServiceEditor(service);
          renderServiceList();
        });
        rows.appendChild(row);
      });

      group.append(summary, rows);
      serviceList.appendChild(group);
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

  function renderServiceSubjectFilter() {
    const selected = state.search.serviceSubjectId;
    const options = state.subjects
      .slice()
      .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0) || a.name.localeCompare(b.name))
      .map((subject) => `<option value="${escapeHtml(subject.id)}">${escapeHtml(subjectDisplay(subject))}</option>`)
      .join("");
    serviceSubjectFilter.innerHTML = `<option value="">All subjects</option>${options}`;
    state.search.serviceSubjectId = state.subjects.some((subject) => subject.id === selected) ? selected : "";
    serviceSubjectFilter.value = state.search.serviceSubjectId;
  }

  function selectedPackageKeys() {
    return Array.from(packageList.querySelectorAll("input[type='checkbox']:checked")).map((input) => input.value);
  }

  async function api(method, url, body) {
    const key = getAdminKey();
    if (!key) {
      window.location.replace("/admin-login.html");
      throw new Error("Your dashboard session has ended.");
    }

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
      if (res.status === 401 || res.status === 403) {
        sessionStorage.removeItem("finbarAdminKey");
        sessionStorage.removeItem(ADMIN_LAST_ACTIVITY_KEY);
        window.location.replace("/admin-login.html?reason=expired");
      }
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

  function formatEurMinor(value) {
    return Number.isFinite(Number(value)) ? `EUR ${(Number(value) / 100).toFixed(2)}` : "amount unavailable";
  }

  function packageExpiryDate(packageRecord) {
    const weeks = { trial: 6, single: 6, pack6: 12, pack12: 20 }[packageRecord.tier];
    const date = new Date(packageRecord.purchasedAt);
    if (!weeks || Number.isNaN(date.getTime())) return "";
    date.setUTCDate(date.getUTCDate() + weeks * 7);
    return date.toISOString();
  }

  function operationBadge(item) {
    if (item.canceled) return "Canceled";
    if (item.status === "Completed") return "Completed";
    if (Array.isArray(item.packageRemaining) && item.packageRemaining.length) return `${item.packageRemaining[0]} package lessons left`;
    if (Array.isArray(item.packageCodes) && item.packageCodes.length) return "Package linked";
    return item.status || "Scheduled";
  }

  function renderActionIssue(item) {
    const packageAttempt = item.type === "package-booking";
    const details = packageAttempt
      ? `${escapeHtml(item.email)} · ${escapeHtml(formatDate(item.datetime || item.createdAt))} · package ${escapeHtml(item.certificate)}`
      : `${escapeHtml(item.actor || "Fin")} · ${escapeHtml(item.type)} · appointment ${escapeHtml(item.appointmentID || "unknown")}${item.targetDate ? ` · requested ${escapeHtml(formatDate(item.targetDate))}` : ""}`;
    const buttons = packageAttempt
      ? `<button type="button" class="btn-secondary" data-reconcile-action="${escapeHtml(item.id)}" data-package-resolution="confirmed" data-appointment-id="${escapeHtml(item.appointmentID)}">Found booking</button>${item.appointmentID ? "" : `<button type="button" class="btn-secondary" data-reconcile-action="${escapeHtml(item.id)}" data-package-resolution="not-booked">Not booked</button>`}`
      : `<button type="button" class="btn-secondary" data-reconcile-action="${escapeHtml(item.id)}" data-appointment-id="${escapeHtml(item.appointmentID)}">Mark reviewed</button>`;
    return `<div class="reconciliation-row"><small>${details} · ${escapeHtml(item.result)}${item.error ? ` · ${escapeHtml(item.error)}` : ""}</small>${buttons}</div>`;
  }

  function renderOperations() {
    const summary = state.operationsSummary || {};
    const issues = state.fulfillmentIssues || [];
    const actionIssues = state.actionIssues || [];
    const hasIssues = issues.length > 0 || actionIssues.length > 0 || Boolean(state.backfillError);
    fulfillmentIssues.classList.toggle("hidden", !hasIssues);
    const actionMarkup = actionIssues.length
      ? `<strong>${actionIssues.length} booking action${actionIssues.length === 1 ? " needs" : "s need"} reconciliation</strong><span>Check the booking in Acuity and confirm any customer email before retrying. A pending action may have reached Acuity even if this page did not receive the result.</span>${actionIssues.map(renderActionIssue).join("")}`
      : "";
    const paymentMarkup = issues.length
      ? `<strong>${issues.length} payment fulfillment${issues.length === 1 ? " needs" : "s need"} reconciliation</strong><span>Do not replay these payments automatically. Check the payment and booking in Stripe/Acuity before resolving them.</span>${issues.map((item) => `<small>${escapeHtml(item.email || "Customer unavailable")} · ${escapeHtml(item.stage || item.status)} · Stripe session ${escapeHtml(item.sessionId || item.orderID || "unknown")}${item.error ? ` · ${escapeHtml(item.error)}` : ""}</small>`).join("")}`
      : "";
    const backfillMarkup = state.backfillError
      ? `<strong>Stripe history import incomplete</strong><span>Some older package records may be missing. Refresh bookings to retry the import.</span><small>${escapeHtml(state.backfillError)}</small>`
      : "";
    const syncWarningMarkup = state.operationsSyncWarning
      ? `<strong>Bookings loaded; details are catching up</strong><span>${escapeHtml(state.operationsSyncWarning)}</span>`
      : "";
    fulfillmentIssues.innerHTML = hasIssues
      ? `${actionMarkup}${paymentMarkup}${backfillMarkup}${syncWarningMarkup}`
      : syncWarningMarkup;
    fulfillmentIssues.classList.toggle("hidden", !hasIssues && !syncWarningMarkup);
    fulfillmentIssues.querySelectorAll("[data-reconcile-action]").forEach((button) => button.addEventListener("click", async () => {
      const resolution = button.dataset.packageResolution || "";
      let appointmentId = button.dataset.appointmentId || "";
      if (resolution === "confirmed") {
        const answer = window.prompt("Enter the matching Acuity appointment ID after checking the client, lesson, time, and package:", appointmentId);
        if (answer === null) return;
        appointmentId = answer.trim();
        if (!appointmentId) return showError("Enter the matching Acuity appointment ID before confirming this booking.");
      } else if (resolution === "not-booked") {
        if (!window.confirm("Confirm Acuity has no matching lesson. This releases the request so the customer may try again, which could create a duplicate if a booking was missed.")) return;
      } else if (!window.confirm("Only mark this reviewed after checking the appointment in Acuity and confirming whether the customer email was sent. This does not repeat or undo the booking action.")) return;
      const note = window.prompt("What did you verify? This note is saved to the audit history:", "")?.trim() || "";
      if (note.length < 8) return showError("Enter a short reconciliation note (at least 8 characters). The action has not been changed.");
      try {
        await api("POST", APPOINTMENT_API, { action: "reconcile", actionId: button.dataset.reconcileAction, appointmentId, resolution, note });
        showStatus(resolution === "not-booked" ? "No booking found; this request may be tried again." : "Action reconciled. No booking or email was repeated.");
        await loadOperations();
        if (state.selectedClientEmail) await loadClient(state.selectedClientEmail);
      } catch (error) { showError(error.message); }
    }));
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
    state.fulfillmentIssues = data.fulfillmentIssues || [];
    state.actionIssues = data.actionIssues || [];
    state.backfillError = data.backfillError || "";
      state.operationsSyncWarning = data.syncWarning || "";
    renderOperations();
    if (data.backfillPending) {
        window.setTimeout(() => loadOperations().catch((error) => showError(error.message)), 1800);
    }
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
    const activeAppointment = !appointment.canceled && appointment.status !== "Completed";
    const changeAllowed = appointment.datetime && Date.now() < new Date(appointment.datetime).getTime() && activeAppointment;
    const noShowAllowed = appointment.datetime && Date.now() >= new Date(appointment.datetime).getTime() + 20 * 60 * 1000 && activeAppointment;
    const completeAllowed = appointment.datetime && Date.now() >= new Date(appointment.datetime).getTime() && !appointment.canceled && appointment.status !== "Completed";
    const recordingAllowed = appointment.format === "oneToTwo" && appointment.status === "Completed";
    clientDrawer.innerHTML = `
      <div class="drawer-head"><div><span class="eyebrow">Client record</span><h3>${escapeHtml(appointment.clientName)}</h3><a href="mailto:${escapeHtml(client.email)}">${escapeHtml(client.email)}</a></div><button type="button" class="drawer-close" aria-label="Close client details">×</button></div>
      <div class="client-booking"><strong>${escapeHtml(appointment.subject)}</strong><span>${escapeHtml(formatDate(appointment.datetime))}</span><small>${escapeHtml(appointment.status)}</small>${appointment.expiresAt ? `<small>Lesson entitlement expires ${escapeHtml(formatDate(appointment.expiresAt))}</small>` : ""}${appointment.policyAcceptedAt ? `<small>Lesson terms accepted ${escapeHtml(formatDate(appointment.policyAcceptedAt))}${appointment.policyVersion ? ` · version ${escapeHtml(appointment.policyVersion.slice(0, 8))}` : ""}</small>` : ""}${appointment.withinLateChangeWindow ? `<small class="policy-warning">Within 12 hours: 50% refund rule applies${appointment.lateChangeRefundMinor !== null ? ` · ${escapeHtml(formatEurMinor(appointment.lateChangeRefundMinor))} based on recorded payment` : " · payment record unavailable"}</small>` : ""}</div>
      <section class="drawer-section"><h4>Client bookings</h4>${(client.appointments || []).map((item) => `<button class="client-appointment${item.id === appointment.id ? " active" : ""}" type="button" data-client-appointment="${escapeHtml(item.id)}"><strong>${escapeHtml(item.subject)}</strong><span>${escapeHtml(formatDate(item.datetime))}</span><small>${escapeHtml(item.status)}</small>${item.policyAcceptedAt ? `<small>Terms accepted ${escapeHtml(formatDate(item.policyAcceptedAt))}</small>` : ""}</button>`).join("")}</section>
      <section class="drawer-section"><h4>Package balance</h4>${packages.length ? packages.map((item) => `<div class="package-balance"><strong>${escapeHtml(item.certificate || "Package code pending")}</strong><span>${Number.isFinite(item.remaining) ? `${item.remaining} lesson${item.remaining === 1 ? "" : "s"} remaining` : "Check completed when this record opened"}</span>${item.tier && item.purchasedAt ? `<small>${escapeHtml(item.tier)} · purchased ${escapeHtml(formatDate(item.purchasedAt))}${!item.linkedManually ? ` · expires ${escapeHtml(formatDate(packageExpiryDate(item)))}` : " · expiry not recorded"}</small>` : ""}</div>`).join("") : `<p class="muted">No linked package yet.</p>`}
        <details class="link-package"><summary>Link an older package</summary><div class="link-package__fields"><input id="linkPackageCode" placeholder="Package code"><input id="linkPackageType" placeholder="Appointment type ID" value="${escapeHtml(appointment.appointmentTypeID)}"><button class="btn-secondary" type="button" id="linkPackageBtn">Link package</button></div></details>
      </section>
      <section class="drawer-section"><h4>Booking actions</h4>
        <div class="action-grid"><button class="btn-secondary" type="button" id="resendBookingBtn">Resend email</button><button class="btn-secondary" type="button" id="showRescheduleBtn"${changeAllowed ? "" : " disabled"}>Reschedule</button><button class="btn-danger" type="button" id="cancelBookingBtn"${changeAllowed ? "" : " disabled"}>Cancel lesson</button><button class="btn-secondary" type="button" id="completeBookingBtn"${completeAllowed ? "" : " disabled"}>Mark completed</button><button class="btn-secondary" type="button" id="noShowBookingBtn"${noShowAllowed ? "" : " disabled"} title="${noShowAllowed ? "" : "Available after the appointment start plus 20 minutes"}">Mark no-show</button></div>
        <div class="reschedule-panel hidden" id="reschedulePanel"><label class="field"><span>New date</span><input id="rescheduleDate" type="date"></label><button class="btn-secondary" id="loadSlotsBtn" type="button">Show available times</button><select id="rescheduleTime" class="hidden"></select><input id="rescheduleNote" class="hidden" placeholder="Optional note for the client"><button class="btn-primary hidden" id="confirmRescheduleBtn" type="button">Confirm reschedule</button></div>
      </section>
      ${recordingAllowed ? `<section class="drawer-section recording-section"><h4>Lesson recording</h4>${appointment.recordingSentAt ? `<p>Last sent ${escapeHtml(formatDate(appointment.recordingSentAt))} to ${escapeHtml(appointment.recordingRecipient || "the recorded recipient")}.</p>` : ""}${appointment.recordingUrl ? `<p><a href="${escapeHtml(appointment.recordingUrl)}" target="_blank" rel="noopener noreferrer">Open saved recording link</a></p>` : ""}<p>Use a private or expiring HTTPS link. Confirm the student or guardian authorized sharing it with this recipient.</p><label class="field"><span>Authorized recipient email</span><input id="recordingRecipient" type="email" autocomplete="email" value="${escapeHtml(appointment.recordingRecipient || "")}" required></label><label class="field"><span>Recording link (HTTPS)</span><input id="recordingUrl" type="url" inputmode="url" value="${escapeHtml(appointment.recordingUrl || "")}" placeholder="https://…" required></label><label class="recording-consent"><input id="recordingAuthorized" type="checkbox"><span>I confirm the student or guardian authorized sharing this recording with this recipient.</span></label><button class="btn-secondary" type="button" id="sendRecordingBtn">${appointment.recordingSentAt ? "Send recording again" : "Send recording"}</button></section>` : ""}
      <section class="drawer-section"><h4>Receipt history</h4>${receipts.length ? receipts.slice(0, 5).map((item) => {
        const delivery = item.deliveryStatus === "accepted"
          ? "Accepted by Make; delivery unconfirmed"
          : item.deliveryStatus === "unknown" || (item.deliveryStatus === undefined && item.sent === null)
            ? "Delivery not recorded"
            : item.sent === true || item.deliveryStatus === "sent" ? "Sent" : "Not sent";
        return `<div class="receipt-history-row"><p class="timeline-row"><strong>${escapeHtml(item.kind || "Email")}</strong><span>${delivery} · ${escapeHtml(formatDate(item.createdAt))}</span></p>${["package", "booking"].includes(item.kind) ? `<button class="btn-secondary" type="button" data-resend-receipt="${escapeHtml(item.id)}">Resend</button>` : ""}</div>`;
      }).join("") : `<p class="muted">No recorded receipt emails yet.</p>`}</section>
      <section class="drawer-section"><h4>Internal action history</h4>${actions.length ? actions.slice(0, 5).map((item) => {
        const resultLabel = item.result === "email_accepted"
          ? "Email accepted; delivery unconfirmed"
          : item.result === "completed_email_failed"
            ? "Booking updated; email failed"
            : item.result || "completed";
        return `<p class="timeline-row"><strong>${escapeHtml(item.type)}</strong><span>${escapeHtml(resultLabel)} · ${escapeHtml(item.actor || "Fin")} · ${escapeHtml(formatDate(item.createdAt))}${item.note ? ` · ${escapeHtml(item.note)}` : ""}</span></p>`;
      }).join("") : `<p class="muted">No dashboard actions yet.</p>`}</section>
    `;
    clientDrawer.querySelector(".drawer-close").addEventListener("click", () => { state.selectedClientEmail = ""; state.selectedAppointmentId = ""; clientDrawer.innerHTML = `<div class="drawer-empty">Select a booking to view the client, package balance, receipt history, and actions.</div>`; renderOperations(); });
    clientDrawer.querySelectorAll("[data-resend-receipt]").forEach((button) => button.addEventListener("click", async () => {
      button.disabled = true;
      try {
        const result = await api("POST", RECEIPT_API, { receiptId: button.dataset.resendReceipt });
        showStatus(result.accepted ? "Make accepted the receipt request; delivery is not yet confirmed." : "Receipt sent to the address recorded for this client.");
        await loadClient(state.selectedClientEmail);
      } catch (error) {
        showError(error.message);
        button.disabled = false;
        await loadClient(state.selectedClientEmail).catch(() => {});
      }
    }));
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
    clientDrawer.querySelector("#sendRecordingBtn")?.addEventListener("click", () => {
      const recipientEmail = clientDrawer.querySelector("#recordingRecipient").value.trim();
      const recordingUrl = clientDrawer.querySelector("#recordingUrl").value.trim();
      const authorized = clientDrawer.querySelector("#recordingAuthorized").checked;
      if (!recipientEmail || !recordingUrl || !authorized) {
        showError("Enter the authorized recipient, recording link, and confirm permission before sending.");
        return;
      }
      runAppointmentAction(appointment, "send-recording", { recipientEmail, recordingUrl, authorized }).catch((error) => showError(error.message));
    });
    clientDrawer.querySelector("#showRescheduleBtn").addEventListener("click", () => clientDrawer.querySelector("#reschedulePanel").classList.remove("hidden"));
    clientDrawer.querySelector("#cancelBookingBtn").addEventListener("click", () => {
      const note = window.prompt("Optional note to include in the cancellation email:", "") || "";
      if (window.confirm("Cancel this lesson? No cash refund is issued automatically. Acuity may return a package credit for a standard cancellation; the balance will be checked again.")) {
        runAppointmentAction(appointment, "cancel", { note }).catch((error) => showError(error.message));
      }
    });
    clientDrawer.querySelector("#noShowBookingBtn").addEventListener("click", () => {
      if (window.confirm("Confirm the tutor waited at least 20 minutes and the client did not attend? Acuity will mark this as a no-show; check the package balance afterward.")) {
        runAppointmentAction(appointment, "no-show").catch((error) => showError(error.message));
      }
    });
    clientDrawer.querySelector("#completeBookingBtn").addEventListener("click", () => {
      if (window.confirm("Confirm that this lesson took place? This records attendance only and does not send a customer email.")) {
        runAppointmentAction(appointment, "complete").catch((error) => showError(error.message));
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
    if (state.appointmentActionPending) return;
    state.appointmentActionPending = true;
    try {
      const result = await api("POST", APPOINTMENT_API, { action, actionId: crypto.randomUUID(), appointmentId: appointment.id, ...extra });
      showStatus(result.email?.deliveryStatus === "failed" ? "Booking updated, but the confirmation email could not be accepted. Contact the client directly." : result.accepted ? "Booking updated. Make accepted the email request; delivery is not yet confirmed." : action === "resend" ? "Customer email sent." : action === "send-recording" ? "Recording link sent to the authorized recipient." : action === "no-show" ? "Lesson marked no-show. Check the package balance in Acuity." : action === "complete" ? "Lesson marked completed." : `Booking ${action}d and branded customer email sent.`);
      await loadOperations();
      await loadClient(state.selectedClientEmail);
      return result;
    } finally {
      state.appointmentActionPending = false;
    }
  }

  function templateLabel(kind) {
    return { package: "Package receipt", booking: "Booking confirmation", rescheduled: "Reschedule confirmation", canceled: "Cancellation confirmation", recording: "Lesson recording" }[kind] || kind;
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
    const packageCode = state.selectedTemplateKind === "recording" ? "" : `<div class="email-preview__code">Package code<br><strong>${values.packageCode}</strong></div>`;
    emailPreview.innerHTML = `<p class="eyebrow">Customer preview</p><h3>${escapeHtml(interpolate(templateHeadingInput.value))}</h3><p>${escapeHtml(interpolate(templateMessageInput.value))}</p>${packageCode}<button type="button">${escapeHtml(interpolate(templateCtaInput.value))}</button><p class="email-preview__note">${escapeHtml(interpolate(templateNoteInput.value))}</p>`;
  }

  async function loadTemplates() {
    const data = await api("GET", TEMPLATE_API);
    state.templates = data.templates || {};
    state.templatesRevision = data._revision || "";
    state.defaults = data.defaults || {};
    if (!state.templates[state.selectedTemplateKind]) state.selectedTemplateKind = Object.keys(state.templates)[0] || "package";
    renderTemplates();
    fillTemplateEditor();
  }

  function proofreadingTemplateLabel(kind) {
    return {
      reviewDocument: "New request - uploaded document",
      reviewPasted: "New request - pasted text",
      accepted: "Request accepted",
      declined: "Request declined"
    }[kind] || kind;
  }

  function proofreadingTemplateAudience(kind) {
    return kind === "reviewDocument" || kind === "reviewPasted" ? "Internal review email" : "Customer email";
  }

  function currentProofreadingTemplate() {
    return state.proofreadingTemplates[state.selectedProofreadingTemplateKind] || {};
  }

  function fillProofreadingTemplateEditor() {
    const template = currentProofreadingTemplate();
    proofTemplateEditorTitle.textContent = proofreadingTemplateLabel(state.selectedProofreadingTemplateKind);
    proofTemplateAudience.textContent = proofreadingTemplateAudience(state.selectedProofreadingTemplateKind);
    proofTemplateSubjectInput.value = template.subject || "";
    proofTemplateHeadingInput.value = template.heading || "";
    proofTemplateMessageInput.value = template.message || "";
    proofTemplateCtaInput.value = template.ctaLabel || "";
    proofTemplateNoteInput.value = template.extraNote || "";
    proofTemplateCtaInput.closest(".field").classList.toggle("hidden", state.selectedProofreadingTemplateKind !== "reviewDocument");
    renderProofreadingEmailPreview();
  }

  function renderProofreadingTemplates() {
    proofTemplateList.innerHTML = Object.keys(state.proofreadingTemplates).map((kind) => `<button class="record-row${kind === state.selectedProofreadingTemplateKind ? " active" : ""}" type="button" data-proof-template-kind="${kind}"><strong>${proofreadingTemplateLabel(kind)}</strong><span>${proofreadingTemplateAudience(kind)}</span></button>`).join("");
    proofTemplateList.querySelectorAll("[data-proof-template-kind]").forEach((button) => button.addEventListener("click", () => {
      state.selectedProofreadingTemplateKind = button.dataset.proofTemplateKind;
      renderProofreadingTemplates();
      fillProofreadingTemplateEditor();
    }));
  }

  function renderProofreadingEmailPreview() {
    const kind = state.selectedProofreadingTemplateKind;
    const values = { clientName: "Jordan", serviceLevel: "Premium", wordCount: "1,250", deadline: "Friday, 2 October", price: "EUR 48.00", reference: "PRF-1064" };
    const interpolate = (value) => String(value || "").replace(/\{(\w+)\}/g, (_, key) => values[key] || "");
    const internal = kind === "reviewDocument" || kind === "reviewPasted";
    const template = {
      heading: interpolate(proofTemplateHeadingInput.value),
      message: interpolate(proofTemplateMessageInput.value),
      ctaLabel: interpolate(proofTemplateCtaInput.value),
      note: interpolate(proofTemplateNoteInput.value)
    };
    const requestRows = internal
      ? `<tr><td>Client</td><td>Jordan Taylor</td></tr><tr><td>Email</td><td>jordan@example.com</td></tr><tr><td>Service level</td><td>${values.serviceLevel}</td></tr><tr><td>Word count</td><td>${values.wordCount} words</td></tr><tr><td>English preference</td><td>UK English</td></tr><tr><td>Deadline</td><td>${values.deadline}</td></tr><tr><td>Fee</td><td>${values.price}</td></tr><tr><td>Reference</td><td>${values.reference}</td></tr>`
      : `<tr><td>Service level</td><td>${values.serviceLevel}</td></tr><tr><td>Word count</td><td>${values.wordCount} words</td></tr><tr><td>English preference</td><td>UK English</td></tr><tr><td>Reference</td><td>${values.reference}</td></tr>`;
    const internalExtras = `${kind === "reviewDocument" && template.ctaLabel ? `<p class="proof-email-preview__button-row"><button type="button">${escapeHtml(template.ctaLabel)}</button></p>` : ""}<div class="proof-email-preview__submitted"><strong>${kind === "reviewDocument" ? "Editing instructions" : "Submitted text"}</strong><p>${kind === "reviewDocument" ? "Please preserve the writer's voice and return a polished academic edit." : "This is a sample of the pasted text Fin will review before deciding."}</p></div><div class="proof-email-preview__actions"><button class="proof-email-preview__accept" type="button">Accept and charge</button><button class="proof-email-preview__decline" type="button">Decline request</button></div>`;
    const customerExtras = kind === "accepted"
      ? `<div class="proof-email-preview__deadline"><strong>Your work will be returned by</strong><span>${values.deadline}</span></div><div class="proof-email-preview__receipt"><strong>Payment receipt</strong><span>Amount charged: ${values.price}<br>Reference: ${values.reference}</span></div>`
      : `<div class="proof-email-preview__deadline"><strong>Payment status</strong><span>Nothing has been charged.</span></div>`;
    proofEmailPreview.innerHTML = `<div class="proof-email-preview"><div class="proof-email-preview__header"><img src="/assets/finbar-horizontal-logo-aligned.png" alt="Finbar B. Elite Tutoring"><p>${internal ? "Proofreading review" : kind === "accepted" ? "Task accepted" : "Request update"}</p><h3>${escapeHtml(template.heading)}</h3></div><div class="proof-email-preview__body"><p class="proof-email-preview__greeting">${internal ? "Hi Fin," : "Hi Jordan,"}</p><p>${escapeHtml(template.message)}</p><table><tbody>${requestRows}</tbody></table>${internal ? internalExtras : customerExtras}<p class="proof-email-preview__note">${escapeHtml(template.note)}</p></div><div class="proof-email-preview__footer">Questions about this request? Reply directly to this email.</div></div>`;
  }

  async function loadProofreadingTemplates() {
    const data = await api("GET", PROOF_TEMPLATE_API);
    state.proofreadingTemplates = data.templates || {};
    state.proofreadingRevision = data._revision || "";
    state.proofreadingDefaults = data.defaults || {};
    if (!state.proofreadingTemplates[state.selectedProofreadingTemplateKind]) state.selectedProofreadingTemplateKind = Object.keys(state.proofreadingTemplates)[0] || "reviewDocument";
    renderProofreadingTemplates();
    fillProofreadingTemplateEditor();
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
    state.bookingRevision = bookingData.revision || "";
    state.couponRevision = couponData._revision || "";

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
    renderServiceSubjectFilter();
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
  backupDownloadBtn.addEventListener("click", async () => {
    if (!window.confirm("This backup contains private client, booking, and payment records. Download it only to a secure device.")) return;
    backupDownloadBtn.disabled = true;
    try {
      const response = await fetch("/api/admin/backup", { headers: { "x-finbar-admin-key": getAdminKey() } });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        if (response.status === 401 || response.status === 403) {
          sessionStorage.removeItem("finbarAdminKey");
          sessionStorage.removeItem(ADMIN_LAST_ACTIVITY_KEY);
          window.location.replace("/admin-login.html?reason=expired");
        }
        throw new Error(data.error || "Could not create the dashboard backup.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = response.headers.get("content-disposition")?.match(/filename="?([^";]+)"?/i)?.[1] || "finbar-dashboard-backup.json";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      showStatus("Backup downloaded. Store it securely; this file contains private client records.");
    } catch (error) {
      showError(error.message);
    } finally {
      backupDownloadBtn.disabled = false;
    }
  });
  backupRestoreFile.addEventListener("change", () => {
    const file = backupRestoreFile.files?.[0];
    backupRestoreBtn.disabled = !file;
    showError(file && file.size > 3.5 * 1024 * 1024 ? "This backup is too large to restore in the dashboard. Keep the original file and ask for help restoring it securely." : "");
    if (file && file.size > 3.5 * 1024 * 1024) backupRestoreBtn.disabled = true;
  });
  backupRestoreBtn.addEventListener("click", async () => {
    const file = backupRestoreFile.files?.[0];
    if (!file) return;
    const section = backupRestoreSection.value;
    const sectionName = backupRestoreSection.selectedOptions[0]?.textContent || section;
    if (!window.confirm(`Restore ${sectionName}? This replaces the current ${sectionName.toLowerCase()} from the selected backup.`)) return;
    if (window.prompt('Type RESTORE to confirm. Download a fresh backup first.') !== "RESTORE") return;

    backupRestoreBtn.disabled = true;
    showError("");
    try {
      let backup;
      try {
        backup = JSON.parse(await file.text());
      } catch {
        throw new Error("That file is not valid JSON.");
      }
      const response = await fetch("/api/admin/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-finbar-admin-key": getAdminKey() },
        body: JSON.stringify({ action: "restore", confirm: "RESTORE", section, backup })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        if (response.status === 401 || response.status === 403) {
          sessionStorage.removeItem("finbarAdminKey");
          sessionStorage.removeItem(ADMIN_LAST_ACTIVITY_KEY);
          window.location.replace("/admin-login.html?reason=expired");
        }
        throw new Error(data.error || "The selected backup section could not be restored.");
      }
      backupRestoreFile.value = "";
      showStatus(`${sectionName} restored. Reopen that dashboard section to refresh its values.`);
    } catch (error) {
      showError(error.message);
    } finally {
      backupRestoreBtn.disabled = !backupRestoreFile.files?.[0];
    }
  });
  logoutBtn.addEventListener("click", () => {
    sessionStorage.removeItem("finbarAdminKey");
    sessionStorage.removeItem(ADMIN_LAST_ACTIVITY_KEY);
    window.location.replace("/admin-login.html");
  });

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
    renderServiceSubjectFilter();
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
    renderServiceSubjectFilter();
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

      const bookingResult = await api("PUT", BOOKING_API, {
        version: 1,
        revision: state.bookingRevision,
        subjects: state.subjects,
        services: state.services
      });

      state.subjects = bookingResult.subjects || state.subjects;
      state.services = bookingResult.services || state.services;
      state.packageCatalog = bookingResult.packageCatalog || state.packageCatalog;
      state.bookingRevision = bookingResult.revision || state.bookingRevision;

      const couponResult = await api("PUT", COUPON_API, {
        _revision: state.couponRevision,
        coupons: state.coupons
      });
      state.coupons = couponResult.coupons || state.coupons;
      state.couponRevision = couponResult._revision || state.couponRevision;

      renderPackageList();
      renderServiceSubjectOptions();
      renderServiceSubjectFilter();
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

  serviceSubjectFilter.addEventListener("change", () => {
    state.search.serviceSubjectId = serviceSubjectFilter.value;
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
      serviceStatus.textContent = serviceConnectionStatus(service);
      renderServiceList();
    });
    input.addEventListener("change", () => {
      const service = buildServicePayload();
      serviceStatus.textContent = serviceConnectionStatus(service);
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
  refreshPricingBtn.addEventListener("click", () => loadPricing().catch((error) => showError(error.message)));
  priceSubjectSelect.addEventListener("change", () => {
    const nextSubjectId = priceSubjectSelect.value;
    try {
      capturePricingEditor();
      state.pricingSubjectId = nextSubjectId;
      renderPricing();
      showError("");
    } catch (error) {
      priceSubjectSelect.value = state.pricingSubjectId;
      showError(error.message);
    }
  });
  priceUseDefaultInput.addEventListener("change", () => {
    if (!state.pricingSubjectId) return;
    if (priceUseDefaultInput.checked) {
      delete state.pricing.subjectPrices[state.pricingSubjectId];
    } else {
      state.pricing.subjectPrices[state.pricingSubjectId] = JSON.parse(JSON.stringify(state.pricing.prices));
    }
    renderPricing();
  });
  savePricingBtn.addEventListener("click", async () => {
    try {
      capturePricingEditor();
      const data = await api("PUT", PRICING_API, state.pricing);
      state.pricing = data.pricing || state.pricing;
      state.pricingServices = data.services || state.pricingServices;
      renderPricing();
      const mapped = state.pricingServices.filter((service) => service.appointmentTypeID);
      const unverified = mapped.filter((service) => !Number.isFinite(service.acuityPrice)).length;
      const mismatches = mapped.filter((service) => service.matchesAcuity === false).length;
      showStatus(`Saved for new website quotes and Stripe checkouts. Acuity is not automatically updated.${mismatches ? ` ${mismatches} price mismatch${mismatches === 1 ? "" : "es"} need attention.` : ""}${unverified ? ` ${unverified} Acuity price${unverified === 1 ? " could not be verified." : "s could not be verified."}` : ""}`);
    } catch (error) {
      showError(error.message);
    }
  });

  [templateSubjectInput, templateHeadingInput, templateMessageInput, templateCtaInput, templateNoteInput].forEach((input) => input.addEventListener("input", renderEmailPreview));
  saveTemplateBtn.addEventListener("click", async () => {
    const templates = { ...state.templates, [state.selectedTemplateKind]: {
      subject: templateSubjectInput.value.trim(),
      heading: templateHeadingInput.value.trim(),
      message: templateMessageInput.value.trim(),
      ctaLabel: templateCtaInput.value.trim(),
      extraNote: templateNoteInput.value.trim()
    } };
    const data = await api("PUT", TEMPLATE_API, { version: 1, _revision: state.templatesRevision, templates });
    state.templates = data.templates || templates;
    state.templatesRevision = data._revision || state.templatesRevision;
    showStatus("Email template saved. Future customer emails will use this wording.");
    renderTemplates();
    fillTemplateEditor();
  });
  resetTemplateBtn.addEventListener("click", async () => {
    if (!window.confirm("Reset this email template to Finbar's default wording?")) return;
    const data = await api("POST", TEMPLATE_API, { kind: state.selectedTemplateKind });
    state.templates = data.templates || state.templates;
    state.templatesRevision = data._revision || state.templatesRevision;
    showStatus("Email template restored to the default wording.");
    renderTemplates();
    fillTemplateEditor();
  });

  [proofTemplateSubjectInput, proofTemplateHeadingInput, proofTemplateMessageInput, proofTemplateCtaInput, proofTemplateNoteInput].forEach((input) => input.addEventListener("input", renderProofreadingEmailPreview));
  saveProofTemplateBtn.addEventListener("click", async () => {
    const templates = { ...state.proofreadingTemplates, [state.selectedProofreadingTemplateKind]: {
      subject: proofTemplateSubjectInput.value.trim(),
      heading: proofTemplateHeadingInput.value.trim(),
      message: proofTemplateMessageInput.value.trim(),
      ctaLabel: proofTemplateCtaInput.value.trim(),
      extraNote: proofTemplateNoteInput.value.trim()
    } };
    const data = await api("PUT", PROOF_TEMPLATE_API, { version: 1, _revision: state.proofreadingRevision, templates });
    state.proofreadingTemplates = data.templates || templates;
    state.proofreadingRevision = data._revision || state.proofreadingRevision;
    showStatus("Proofreading email template saved. Future proofreading emails will use this wording.");
    renderProofreadingTemplates();
    fillProofreadingTemplateEditor();
  });
  resetProofTemplateBtn.addEventListener("click", async () => {
    if (!window.confirm("Reset this proofreading email template to Finbar's default wording?")) return;
    const data = await api("POST", PROOF_TEMPLATE_API, { kind: state.selectedProofreadingTemplateKind });
    state.proofreadingTemplates = data.templates || state.proofreadingTemplates;
    state.proofreadingRevision = data._revision || state.proofreadingRevision;
    showStatus("Proofreading email template restored to the default wording.");
    renderProofreadingTemplates();
    fillProofreadingTemplateEditor();
  });

  setTab("operations");
  load().catch((error) => {
    showStatus("");
    showError(error.message);
  });
})();
