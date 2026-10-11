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
  const ACUITY_IMPORT_API = "/api/admin/coupons?resource=acuity-import";

  const tabButtons = Array.from(document.querySelectorAll(".admin-tab"));
  const tabPanels = Array.from(document.querySelectorAll(".admin-tab-panel"));
  const subjectList = document.getElementById("subjectList");
  const serviceList = document.getElementById("serviceList");
  const packageList = document.getElementById("packageList");
  const couponList = document.getElementById("couponList");
  const adminError = document.getElementById("adminError");
  const adminStatus = document.getElementById("adminStatus");
  const dashboardActivity = document.getElementById("dashboardActivity");
  const dashboardActivityText = document.getElementById("dashboardActivityText");
  const refreshBtn = document.getElementById("refreshBtn");
  const discardBtn = document.getElementById("discardBtn");
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
  const acuityImportBtn = document.getElementById("acuityImportBtn");
  const acuityImportDialog = document.getElementById("acuityImportDialog");
  const acuityImportBody = document.getElementById("acuityImportBody");
  const acuityImportFooter = document.getElementById("acuityImportFooter");
  const acuityImportStatus = document.getElementById("acuityImportStatus");
  const saveImportedMappingsBtn = document.getElementById("saveImportedMappingsBtn");
  const saveImportedPricesBtn = document.getElementById("saveImportedPricesBtn");
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
  const priceSubjectHint = document.getElementById("priceSubjectHint");
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
    pricingBaseline: "",
    pricingServices: [],
    acuityImportRows: [],
    acuityPriceCurrencyConfirmed: false,
    bookingRevision: "",
    couponRevision: "",
    bookingBaseline: { subjects: [], services: [] },
    couponBaseline: [],
    setupLoaded: false,
    pricingSubjectId: "",
    useDefaultPricing: false,
    dirtyTabs: new Set(),
    pendingTasks: 0,
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
    const detail = String(message || "");
    if (/record changed while you were editing|newer edit|changed by someone else|removed by someone else|already exists with different details/i.test(detail)) {
      adminError.textContent = "Someone saved a newer version while you were editing. Your draft is still on screen. Refresh to see the latest saved values, then reapply your change.";
      adminError.classList.add("hidden");
      adminStatus.textContent = adminError.textContent;
      if (!state.pendingTasks) setActivity("dirty", "Draft needs review");
      return;
    }
    adminError.textContent = /record changed while you were editing/i.test(detail)
      ? "Your changes were not saved because a newer version exists. Your edits are still on screen. Copy them before refreshing; refresh replaces the draft with the latest saved version."
      : detail;
    adminError.classList.toggle("hidden", !message);
    if (message) setActivity("error", "Action needed");
  }

  function showStatus(message) {
    adminStatus.textContent = message || "";
    if (message && !state.pendingTasks && adminError.classList.contains("hidden")) {
      if (/^loading/i.test(message)) setActivity("loading", "Loading");
      else setActivity("saved", /saved|restored|downloaded/i.test(message) ? "Saved" : "Ready");
    }
  }

  function setActivity(kind, label) {
    dashboardActivity.dataset.state = kind;
    dashboardActivityText.textContent = label;
  }

  function markDirty(tab = state.tab) {
    state.dirtyTabs.add(tab);
    showError("");
    discardBtn.classList.toggle("hidden", !state.dirtyTabs.has(state.tab));
    setActivity("dirty", "Unsaved changes");
  }

  function clearDirty(tab = state.tab) {
    state.dirtyTabs.delete(tab);
    discardBtn.classList.toggle("hidden", !state.dirtyTabs.has(state.tab));
    if (!state.pendingTasks) setActivity("saved", "Saved");
  }

  async function runTask(button, label, work, options = {}) {
    if (button?.disabled) return;
    state.pendingTasks += 1;
    const originalLabel = button?.textContent;
    const priorStatus = adminStatus.textContent;
    if (button) {
      button.disabled = true;
      button.classList.add("is-working");
      button.textContent = label;
    }
    if (options.localError) {
      options.localError.classList.remove("has-error");
      options.localError.textContent = `${label}…`;
    }
    showError("");
    setActivity("loading", label);
    try {
      return await work();
    } catch (error) {
      if (options.localError) {
        options.localError.textContent = error.message || "This action did not complete. Please try again.";
        options.localError.classList.add("has-error");
      } else showError(error.message || "This action did not complete. Please try again.");
    } finally {
      state.pendingTasks -= 1;
      if (button) {
        button.disabled = false;
        button.classList.remove("is-working");
        button.textContent = originalLabel;
      }
      if (!state.pendingTasks && adminError.classList.contains("hidden")) {
        const dirty = state.dirtyTabs.has(state.tab);
        const saved = adminStatus.textContent !== priorStatus && /saved|restored|downloaded/i.test(adminStatus.textContent);
        setActivity(dirty ? "dirty" : "saved", dirty ? "Unsaved changes" : saved ? "Saved" : "Ready");
      }
    }
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
    if (tab !== state.tab && state.dirtyTabs.has(state.tab)) {
      showError("Save or discard your edits before opening another section.");
      return false;
    }
    if (tab === state.tab && state.dirtyTabs.has(tab)) return true;
    if (tab !== state.tab) showStatus("");
    state.tab = tab;
    const selectedTab = tabButtons.find((btn) => btn.dataset.tab === tab);
    tabButtons.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tab === tab);
      if (btn.dataset.tab === tab) btn.setAttribute("aria-current", "page");
      else btn.removeAttribute("aria-current");
    });
    tabPanels.forEach((panel) => panel.classList.toggle("hidden", panel.dataset.panel !== tab));
    if (selectedTab) {
      dashboardTitle.textContent = selectedTab.dataset.title || selectedTab.textContent.trim();
      dashboardKicker.textContent = selectedTab.dataset.kicker || "Booking dashboard";
    }
    saveBtn.classList.toggle("hidden", !["subjects", "services", "coupons"].includes(tab));
    discardBtn.classList.toggle("hidden", !state.dirtyTabs.has(tab));
    showError("");
    if (!state.dirtyTabs.has(tab)) setActivity("saved", "Ready");
    if (getAdminKey() && tab === "operations") runTask(refreshOperationsBtn, "Loading bookings", loadOperations);
    if (getAdminKey() && tab === "pricing") runTask(refreshPricingBtn, "Loading prices", loadPricing);
    if (getAdminKey() && tab === "templates") runTask(null, "Loading email templates", loadTemplates);
    if (getAdminKey() && tab === "proofreading-templates") runTask(null, "Loading proofreading emails", loadProofreadingTemplates);
    return true;
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
    const options = [`<option value="">Shared defaults</option>`, ...state.subjects.map((subject) => {
      const priceMode = state.pricing.subjectPrices[subject.id] ? "Individual prices" : "Shared prices";
      return `<option value="${escapeHtml(subject.id)}">${escapeHtml(subject.name)} - ${priceMode}</option>`;
    })];
    priceSubjectSelect.innerHTML = options.join("");
    if (!state.subjects.some((subject) => subject.id === state.pricingSubjectId)) state.pricingSubjectId = "";
    priceSubjectSelect.value = state.pricingSubjectId;
    const overrides = state.pricing.subjectPrices[state.pricingSubjectId];
    state.useDefaultPricing = Boolean(state.pricingSubjectId && !overrides);
    priceUseDefaultWrap.classList.toggle("hidden", !state.pricingSubjectId);
    priceUseDefaultInput.checked = state.useDefaultPricing;
    if (priceSubjectHint) {
      priceSubjectHint.textContent = !state.pricingSubjectId
        ? "Shared defaults apply only to subjects without their own price matrix. Choose a subject and turn off shared defaults to price it independently."
        : state.useDefaultPricing
          ? "This subject currently inherits shared prices. Turn off the checkbox above to create prices used only by this subject's popup and checkout."
          : "These prices apply only to this subject's popup and checkout. Acuity appointment-type prices must still be updated separately.";
    }
    const prices = state.pricingSubjectId && overrides ? overrides : state.pricing.prices;
    const tiers = { trial: "Trial class", single: "Single lesson", pack6: "6-class package", pack12: "12-class package" };
    priceEditorGrid.innerHTML = `<div class="price-matrix__head"><span>Lesson type</span><span>One student (1:1)</span><span>Two students (1:2)</span></div>${Object.entries(tiers).map(([tier, label]) => `<div class="price-matrix__row"><strong>${label}</strong>${["oneToOne", "oneToTwo"].map((format) => `<label class="price-matrix__amount"><span class="sr-only">${escapeHtml(priceLabel(format, tier))} EUR</span><span aria-hidden="true">EUR</span><input type="number" min="0" max="100000" step="0.01" inputmode="decimal" data-price-format="${format}" data-price-tier="${tier}" value="${Number(prices?.[format]?.[tier] ?? 0).toFixed(2)}"${state.useDefaultPricing ? " disabled" : ""}></label>`).join("")}</div>`).join("")}`;
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
    state.pricingBaseline = pricingContent(state.pricing);
    state.pricing.subjectPrices = state.pricing.subjectPrices || {};
    state.pricingServices = data.services || [];
    renderPricing();
  }

  function pricingContent(pricing) {
    return JSON.stringify({ version: pricing?.version, currency: pricing?.currency, prices: pricing?.prices, subjectPrices: pricing?.subjectPrices, popup: pricing?.popup });
  }

  async function savePricingWithRevisionCheck(draft) {
    try {
      return await api("PUT", PRICING_API, draft);
    } catch (error) {
      if (!/record changed while you were editing/i.test(error.message || "")) throw error;
      const latest = await api("GET", PRICING_API);
      if (!latest.pricing?._revision) throw error;
      const merged = window.AdminMerge.mergeObject(
        JSON.parse(state.pricingBaseline),
        JSON.parse(pricingContent(draft)),
        JSON.parse(pricingContent(latest.pricing)),
        "Pricing settings"
      );
      const result = await api("PUT", PRICING_API, { ...merged, _revision: latest.pricing._revision });
      showStatus("A newer save was detected. Your non-conflicting price and popup edits were safely merged and saved.");
      return result;
    }
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

  async function saveBookingWithRevisionCheck(subjects, services) {
    try {
      return await api("PUT", BOOKING_API, { version: 1, revision: state.bookingRevision, subjects, services });
    } catch (error) {
      if (!/record changed while you were editing/i.test(error.message || "")) throw error;
      const latest = await api("GET", BOOKING_API);
      const mergedSubjects = window.AdminMerge.mergeRecords(state.bookingBaseline.subjects, subjects, latest.subjects || [], "id", ["name", "slug", "label", "note", "order", "active"], "This subject");
      const mergedServices = window.AdminMerge.mergeRecords(state.bookingBaseline.services, services, latest.services || [], "id", ["subjectId", "format", "tier", "label", "appointmentTypeID", "productID", "calendarID", "bookingLink", "note", "order", "active"], "This lesson type");
      const result = await api("PUT", BOOKING_API, { version: 1, revision: latest.revision, subjects: mergedSubjects, services: mergedServices });
      showStatus("A newer save was detected. Your non-conflicting changes were safely merged and saved.");
      return result;
    }
  }

  async function saveCouponsWithRevisionCheck(coupons) {
    try {
      return await api("PUT", COUPON_API, { _revision: state.couponRevision, coupons });
    } catch (error) {
      if (!/record changed while you were editing/i.test(error.message || "")) throw error;
      const latest = await api("GET", COUPON_API);
      const merged = window.AdminMerge.mergeRecords(state.couponBaseline, coupons, latest.coupons || [], "code", ["percent", "label", "message", "active", "packageKeys"], "This coupon");
      const result = await api("PUT", COUPON_API, { _revision: latest._revision, coupons: merged });
      showStatus("A newer save was detected. Your non-conflicting changes were safely merged and saved.");
      return result;
    }
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
        if (state.dirtyTabs.has("subjects") && subject.id !== state.selectedSubjectId) return showError("Save or discard this subject before selecting another.");
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
      group.open = Boolean(subjectFilter || services.some((service) => service.id === state.selectedServiceId));
      group.addEventListener("toggle", () => {
        if (!group.open) return;
        serviceList.querySelectorAll(".service-group[open]").forEach((openGroup) => {
          if (openGroup !== group) openGroup.open = false;
        });
      });

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
          if (state.dirtyTabs.has("services") && service.id !== state.selectedServiceId) return showError("Save or discard this lesson type before selecting another.");
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
        if (state.dirtyTabs.has("coupons") && coupon.code !== state.selectedCouponCode) return showError("Save or discard this coupon before selecting another.");
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
    if (!state.operations.length) operationsList.innerHTML = `<div class="dashboard-loading"><span class="dashboard-loading__spinner" aria-hidden="true"></span>Loading bookings...</div>`;
    try {
      const data = await api("GET", OPERATIONS_API);
      state.operations = data.appointments || [];
      state.operationsSummary = data.summary || {};
      state.fulfillmentIssues = data.fulfillmentIssues || [];
      state.actionIssues = data.actionIssues || [];
      state.backfillError = data.backfillError || "";
      state.operationsSyncWarning = data.syncWarning || "";
      renderOperations();
      if (data.backfillPending) {
        window.setTimeout(() => runTask(refreshOperationsBtn, "Loading bookings", loadOperations), 1800);
      }
    } catch (error) {
      if (window.AcuityImportRules.isConnectionUnavailable(error.message)) {
        if (state.operations.length) {
          state.operationsSyncWarning = "Acuity is disconnected. Showing the last loaded bookings; no booking changes were made.";
          renderOperations();
          return;
        }
        operationsList.innerHTML = `<div class="dashboard-load-notice" role="status"><strong>Acuity isn’t connected here yet.</strong><span>Connect the right Acuity account to load bookings. No bookings have been changed.</span><button type="button" class="btn-secondary">Try again</button></div>`;
        operationsList.querySelector("button").addEventListener("click", () => runTask(refreshOperationsBtn, "Loading bookings", loadOperations));
        adminStatus.textContent = "";
        return;
      }
      operationsList.innerHTML = `<div class="dashboard-load-error"><strong>Bookings could not be loaded.</strong><span>Your existing bookings have not been changed.</span><button type="button" class="btn-secondary">Try again</button></div>`;
      operationsList.querySelector("button").addEventListener("click", () => runTask(refreshOperationsBtn, "Loading bookings", loadOperations));
      throw error;
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
    const lateRefundReady = appointment.withinLateChangeWindow && !appointment.lateChangeRefunded && appointment.hasRecordedPayment && Number.isInteger(appointment.lateChangeRefundMinor) && appointment.lateChangeRefundMinor > 0;
    const lateRefundInstruction = appointment.lateChangeRefunded
      ? "A 50% late-change refund is already recorded for this booking; another refund cannot be applied."
      : appointment.lateChangeRefundRetryable
        ? "A prior booking change failed after the refund was issued. Reuse that same Stripe refund ID to retry; do not issue another refund."
        : `Within 12 hours: issue the exact 50% refund in Stripe first${appointment.lateChangeRefundMinor !== null ? ` (${formatEurMinor(appointment.lateChangeRefundMinor)})` : " · payment amount unavailable"}, then enter its refund ID when rescheduling.`;
    const fullRefundRequired = !appointment.withinLateChangeWindow && appointment.hasRecordedPayment && !appointment.hasPackageEntitlement && ["single", "trial"].includes(appointment.tier);
    const fullRefundRetryable = fullRefundRequired && appointment.refundRetryable;
    const fullRefundReady = fullRefundRequired && Number.isInteger(appointment.earlyCancellationRefundMinor) && appointment.earlyCancellationRefundMinor > 0 && (!appointment.refundAlreadyRecorded || fullRefundRetryable);
    const refundRequired = appointment.withinLateChangeWindow || fullRefundRequired;
    const refundAmount = appointment.withinLateChangeWindow ? appointment.lateChangeRefundMinor : appointment.earlyCancellationRefundMinor;
    const refundHelp = appointment.lateChangeRefundRetryable || fullRefundRetryable
      ? "Reuse the Stripe refund ID from the earlier attempt. Do not issue another refund."
      : `Issue the ${formatEurMinor(refundAmount)} refund in Stripe first, then enter its refund ID here.`;
    const refundField = refundRequired ? `<label class="field"><span>Stripe refund ID</span><input class="action-refund-id" type="text" placeholder="re_..."><small>${escapeHtml(refundHelp)}</small></label>` : "";
    const changeAllowed = appointment.datetime && Date.now() < new Date(appointment.datetime).getTime() && activeAppointment && (!appointment.withinLateChangeWindow || lateRefundReady);
    const cancelAllowed = changeAllowed && !(appointment.withinLateChangeWindow && appointment.hasPackageEntitlement) && (!fullRefundRequired || fullRefundReady);
    const noShowAllowed = appointment.datetime && Date.now() >= new Date(appointment.datetime).getTime() + 20 * 60 * 1000 && activeAppointment;
    const completeAllowed = appointment.datetime && Date.now() >= new Date(appointment.datetime).getTime() && !appointment.canceled && appointment.status !== "Completed";
    const recordingAllowed = appointment.format === "oneToTwo" && appointment.status === "Completed";
    clientDrawer.innerHTML = `
      <div class="drawer-head"><div><span class="eyebrow">Client record</span><h3>${escapeHtml(appointment.clientName)}</h3><a href="mailto:${escapeHtml(client.email)}">${escapeHtml(client.email)}</a></div><button type="button" class="drawer-close" aria-label="Close client details">×</button></div>
      <div class="client-booking"><strong>${escapeHtml(appointment.subject)}</strong><span>${escapeHtml(formatDate(appointment.datetime))}</span><small>${escapeHtml(appointment.status)}</small>${appointment.expiresAt ? `<small>Lesson entitlement expires ${escapeHtml(formatDate(appointment.expiresAt))}</small>` : ""}${appointment.policyAcceptedAt ? `<small>Lesson terms accepted ${escapeHtml(formatDate(appointment.policyAcceptedAt))}${appointment.policyVersion ? ` · version ${escapeHtml(appointment.policyVersion.slice(0, 8))}` : ""}</small>` : ""}${appointment.withinLateChangeWindow ? `<small class="policy-warning">${escapeHtml(lateRefundInstruction)} ${appointment.hasPackageEntitlement ? "Late cancellation stays blocked here because Acuity may restore the package credit." : "The dashboard verifies the refund before changing this booking."}</small>` : fullRefundRequired ? `<small class="policy-warning">${fullRefundRetryable ? "The previous cancellation attempt failed after the refund. Reuse its existing Stripe refund ID; do not issue another refund." : appointment.refundAlreadyRecorded ? "A refund is already recorded for this lesson; cancellation is blocked to prevent a duplicate." : Number.isInteger(appointment.earlyCancellationRefundMinor) && appointment.earlyCancellationRefundMinor > 0 ? `For a free early cancellation, issue a full Stripe refund of ${formatEurMinor(appointment.earlyCancellationRefundMinor)} first, then enter its refund ID.` : "The original payment amount is unavailable; cancellation needs manual payment review."}</small>` : ""}</div>
      <section class="drawer-section"><h4>Client bookings</h4>${(client.appointments || []).map((item) => `<button class="client-appointment${item.id === appointment.id ? " active" : ""}" type="button" data-client-appointment="${escapeHtml(item.id)}"><strong>${escapeHtml(item.subject)}</strong><span>${escapeHtml(formatDate(item.datetime))}</span><small>${escapeHtml(item.status)}</small>${item.policyAcceptedAt ? `<small>Terms accepted ${escapeHtml(formatDate(item.policyAcceptedAt))}</small>` : ""}</button>`).join("")}</section>
      <section class="drawer-section"><h4>Package balance</h4>${packages.length ? packages.map((item) => `<div class="package-balance"><strong>${escapeHtml(item.certificate || "Package code pending")}</strong><span>${Number.isFinite(item.remaining) ? `${item.remaining} lesson${item.remaining === 1 ? "" : "s"} remaining` : "Check completed when this record opened"}</span>${item.tier && item.purchasedAt ? `<small>${escapeHtml(item.tier)} · purchased ${escapeHtml(formatDate(item.purchasedAt))}${!item.linkedManually ? ` · expires ${escapeHtml(formatDate(packageExpiryDate(item)))}` : " · expiry not recorded"}</small>` : ""}</div>`).join("") : `<p class="muted">No linked package yet.</p>`}
        <details class="link-package"><summary>Link an older package</summary><div class="link-package__fields"><input id="linkPackageCode" placeholder="Package code"><input id="linkPackageType" placeholder="Appointment type ID" value="${escapeHtml(appointment.appointmentTypeID)}"><button class="btn-secondary" type="button" id="linkPackageBtn">Link package</button></div></details>
      </section>
      <section class="drawer-section"><h4>Booking actions</h4>
        <div class="action-grid"><button class="btn-secondary" type="button" id="resendBookingBtn">Resend email</button><button class="btn-secondary" type="button" id="showRescheduleBtn"${changeAllowed ? "" : " disabled"}>Reschedule</button><button class="btn-danger" type="button" id="cancelBookingBtn"${cancelAllowed ? "" : " disabled"}>Cancel lesson</button><button class="btn-secondary" type="button" id="completeBookingBtn"${completeAllowed ? "" : " disabled"}>Mark completed</button><button class="btn-secondary" type="button" id="noShowBookingBtn"${noShowAllowed ? "" : " disabled"} title="${noShowAllowed ? "" : "Available after the appointment start plus 20 minutes"}">Mark no-show</button></div>
        <div class="reschedule-panel hidden" id="reschedulePanel"><h5>Move this lesson</h5><label class="field"><span>New date</span><input id="rescheduleDate" type="date"></label><button class="btn-secondary" id="loadSlotsBtn" type="button">Show available times</button><label class="field hidden" id="rescheduleTimeWrap"><span>Available times</span><select id="rescheduleTime"></select></label><label class="field hidden" id="rescheduleNoteWrap"><span>Note for the client (optional)</span><input id="rescheduleNote" type="text" placeholder="Add a short note"></label>${appointment.withinLateChangeWindow ? `<div class="reschedule-refund">${refundField}</div>` : ""}<button class="btn-primary hidden" id="confirmRescheduleBtn" type="button">Confirm new time</button></div>
        <div class="reschedule-panel hidden" id="cancelPanel"><h5>Cancel this lesson</h5><p>${refundRequired ? escapeHtml(refundHelp) : "The lesson will be canceled in Acuity. No refund is issued automatically."}</p>${refundRequired ? `<div class="cancel-refund">${refundField}</div>` : ""}<label class="field"><span>Note for the client (optional)</span><textarea id="cancelNote" rows="3" placeholder="Explain the cancellation if needed"></textarea></label><button class="btn-danger" id="confirmCancelBtn" type="button">Confirm cancellation</button></div>
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
    clientDrawer.querySelectorAll("[data-resend-receipt]").forEach((button) => button.addEventListener("click", () => runTask(button, "Sending receipt", async () => {
        const result = await api("POST", RECEIPT_API, { receiptId: button.dataset.resendReceipt });
        showStatus(result.accepted ? "Make accepted the receipt request; delivery is not yet confirmed." : "Receipt sent to the address recorded for this client.");
        try { await loadClient(state.selectedClientEmail); }
        catch { showError("The receipt request succeeded, but the client details could not refresh. Do not resend it yet."); }
      })));
    clientDrawer.querySelectorAll("[data-client-appointment]").forEach((button) => button.addEventListener("click", () => { state.selectedAppointmentId = button.dataset.clientAppointment; renderClientDrawer(client); renderOperations(); }));
    clientDrawer.querySelector("#linkPackageBtn").addEventListener("click", (event) => runTask(event.currentTarget, "Linking package", async () => {
      const certificate = clientDrawer.querySelector("#linkPackageCode").value.trim();
      const appointmentTypeID = clientDrawer.querySelector("#linkPackageType").value.trim();
      if (!certificate || !appointmentTypeID) throw new Error("Enter the package code and its Acuity appointment type ID.");
      await api("POST", CLIENT_API, { email: client.email, certificate, appointmentTypeID, subject: appointment.subject, format: appointment.format, tier: appointment.tier });
      showStatus("Package linked. Its balance will now be checked.");
      try {
        await loadClient(client.email);
        await loadOperations();
      } catch {
        showError("The package was linked, but the latest balance could not be loaded. Refresh the dashboard; do not link it again.");
      }
    }));
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
    clientDrawer.querySelector("#showRescheduleBtn").addEventListener("click", () => {
      clientDrawer.querySelector("#cancelPanel").classList.add("hidden");
      clientDrawer.querySelector("#reschedulePanel").classList.toggle("hidden");
    });
    clientDrawer.querySelector("#cancelBookingBtn").addEventListener("click", () => {
      clientDrawer.querySelector("#reschedulePanel").classList.add("hidden");
      clientDrawer.querySelector("#cancelPanel").classList.toggle("hidden");
    });
    clientDrawer.querySelector("#confirmCancelBtn").addEventListener("click", () => {
      const stripeRefundId = clientDrawer.querySelector("#cancelPanel .action-refund-id")?.value.trim() || "";
      if (refundRequired && !stripeRefundId) return showError("Enter the Stripe refund ID before canceling this lesson.");
      const note = clientDrawer.querySelector("#cancelNote").value.trim();
      if (window.confirm("Cancel this lesson in Acuity and send the customer a cancellation email?")) {
        runAppointmentAction(appointment, "cancel", { note, ...(stripeRefundId ? { stripeRefundId } : {}) }).catch((error) => showError(error.message));
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
    clientDrawer.querySelector("#loadSlotsBtn").addEventListener("click", (event) => runTask(event.currentTarget, "Finding times", () => loadAppointmentSlots(appointment)));
    clientDrawer.querySelector("#confirmRescheduleBtn").addEventListener("click", () => {
      const datetime = clientDrawer.querySelector("#rescheduleTime").value;
      const note = clientDrawer.querySelector("#rescheduleNote").value.trim();
      const stripeRefundId = clientDrawer.querySelector("#reschedulePanel .action-refund-id")?.value.trim() || "";
      if (appointment.withinLateChangeWindow && !stripeRefundId) return showError("Enter the Stripe refund ID before moving this lesson.");
      if (datetime && window.confirm(`Move this lesson to ${formatDate(datetime)} and send the customer an updated confirmation?`)) {
        runAppointmentAction(appointment, "reschedule", { datetime, calendarID: appointment.calendarID, note, ...(stripeRefundId ? { stripeRefundId } : {}) }).catch((error) => showError(error.message));
      }
    });
  }

  async function loadClient(email) {
    clientDrawer.innerHTML = `<div class="dashboard-loading"><span class="dashboard-loading__spinner" aria-hidden="true"></span>Loading client details...</div>`;
    try {
      const data = await api("GET", `${CLIENT_API}&email=${encodeURIComponent(email)}`);
      if (state.selectedClientEmail === email) renderClientDrawer(data);
    } catch (error) {
      clientDrawer.innerHTML = `<div class="dashboard-load-error"><strong>Client details could not be loaded.</strong><span>No booking has been changed.</span><button type="button" class="btn-secondary">Try again</button></div>`;
      clientDrawer.querySelector("button").addEventListener("click", () => runTask(null, "Loading client details", () => loadClient(email)));
      throw error;
    }
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
    clientDrawer.querySelector("#rescheduleTimeWrap").classList.remove("hidden");
    clientDrawer.querySelector("#rescheduleNoteWrap").classList.remove("hidden");
    clientDrawer.querySelector("#confirmRescheduleBtn").classList.toggle("hidden", !slots.length);
  }

  async function runAppointmentAction(appointment, action, extra = {}) {
    if (state.appointmentActionPending) return;
    state.appointmentActionPending = true;
    try {
      const button = document.activeElement?.closest?.("button") || null;
      return await runTask(button, "Updating booking", async () => {
        const result = await api("POST", APPOINTMENT_API, { action, actionId: crypto.randomUUID(), appointmentId: appointment.id, ...extra });
        showStatus(result.email?.deliveryStatus === "failed" ? "Booking updated, but the confirmation email could not be accepted. Contact the client directly." : result.accepted ? "Booking updated. Make accepted the email request; delivery is not yet confirmed." : action === "resend" ? "Customer email sent." : action === "send-recording" ? "Recording link sent to the authorized recipient." : action === "no-show" ? "Lesson marked no-show. Check the package balance in Acuity." : action === "complete" ? "Lesson marked completed." : `Booking ${action}d and branded customer email sent.`);
        try {
          await loadOperations();
          await loadClient(state.selectedClientEmail);
        } catch {
          showError("The booking action succeeded, but the latest details could not be loaded. Refresh the dashboard; do not repeat the action.");
        }
        return result;
      });
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
    templateList.querySelectorAll("[data-template-kind]").forEach((button) => button.addEventListener("click", () => {
      if (state.dirtyTabs.has("templates") && button.dataset.templateKind !== state.selectedTemplateKind) return showError("Save or discard this email before selecting another.");
      state.selectedTemplateKind = button.dataset.templateKind;
      renderTemplates();
      fillTemplateEditor();
    }));
  }

  function renderEmailPreview() {
    const values = { recipientName: "Jordan", subject: "English Literature", bookingDate: "Tuesday, 30 September at 16:00", packageCode: "AB12CD34", actionNote: "Please contact Fin if you have any questions." };
    const interpolate = (value) => String(value || "").replace(/\{(\w+)\}/g, (_, key) => values[key] || "");
    const packageCode = state.selectedTemplateKind === "recording" ? "" : `<div class="email-preview__code">Package code<br><strong>${values.packageCode}</strong></div>`;
    emailPreview.innerHTML = `<p class="eyebrow">Customer preview</p><h3>${escapeHtml(interpolate(templateHeadingInput.value))}</h3><p>${escapeHtml(interpolate(templateMessageInput.value))}</p>${packageCode}<button type="button">${escapeHtml(interpolate(templateCtaInput.value))}</button><p class="email-preview__note">${escapeHtml(interpolate(templateNoteInput.value))}</p>`;
  }

  async function loadTemplates() {
    templateList.innerHTML = `<div class="dashboard-loading"><span class="dashboard-loading__spinner" aria-hidden="true"></span>Loading email templates...</div>`;
    try {
      const data = await api("GET", TEMPLATE_API);
      state.templates = data.templates || {};
      state.templatesRevision = data._revision || "";
      state.defaults = data.defaults || {};
      if (!state.templates[state.selectedTemplateKind]) state.selectedTemplateKind = Object.keys(state.templates)[0] || "package";
      renderTemplates();
      fillTemplateEditor();
    } catch (error) {
      templateList.innerHTML = `<div class="dashboard-load-error"><strong>Email templates could not be loaded.</strong><button type="button" class="btn-secondary">Try again</button></div>`;
      templateList.querySelector("button").addEventListener("click", () => runTask(null, "Loading email templates", loadTemplates));
      throw error;
    }
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
      if (state.dirtyTabs.has("proofreading-templates") && button.dataset.proofTemplateKind !== state.selectedProofreadingTemplateKind) return showError("Save or discard this email before selecting another.");
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
    proofTemplateList.innerHTML = `<div class="dashboard-loading"><span class="dashboard-loading__spinner" aria-hidden="true"></span>Loading proofreading emails...</div>`;
    try {
      const data = await api("GET", PROOF_TEMPLATE_API);
      state.proofreadingTemplates = data.templates || {};
      state.proofreadingRevision = data._revision || "";
      state.proofreadingDefaults = data.defaults || {};
      if (!state.proofreadingTemplates[state.selectedProofreadingTemplateKind]) state.selectedProofreadingTemplateKind = Object.keys(state.proofreadingTemplates)[0] || "reviewDocument";
      renderProofreadingTemplates();
      fillProofreadingTemplateEditor();
    } catch (error) {
      proofTemplateList.innerHTML = `<div class="dashboard-load-error"><strong>Proofreading emails could not be loaded.</strong><button type="button" class="btn-secondary">Try again</button></div>`;
      proofTemplateList.querySelector("button").addEventListener("click", () => runTask(null, "Loading proofreading emails", loadProofreadingTemplates));
      throw error;
    }
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
    showStatus("Loading booking setup...");
    state.setupLoaded = false;
    [addSubjectBtn, addServiceBtn, addCouponBtn, saveBtn].forEach((button) => { button.disabled = true; });
    [subjectList, serviceList, couponList].forEach((list) => {
      list.innerHTML = `<div class="dashboard-loading"><span class="dashboard-loading__spinner" aria-hidden="true"></span>Loading saved items...</div>`;
    });

    let bookingData;
    let couponData;
    try {
      [bookingData, couponData] = await Promise.all([api("GET", BOOKING_API), api("GET", COUPON_API)]);
    } catch (error) {
      [subjectList, serviceList, couponList].forEach((list) => {
        list.innerHTML = `<div class="dashboard-load-error"><strong>Booking setup could not be loaded.</strong><span>No saved items have been changed.</span><button type="button" class="btn-secondary">Try again</button></div>`;
        list.querySelector("button").addEventListener("click", () => runTask(refreshBtn, "Loading booking setup", load));
      });
      throw error;
    }

    state.subjects = bookingData.subjects || [];
    state.services = bookingData.services || [];
    state.packageCatalog = bookingData.packageCatalog || couponData.packageCatalog || [];
    state.coupons = couponData.coupons || [];
    state.bookingRevision = bookingData.revision || "";
    state.couponRevision = couponData._revision || "";
    state.bookingBaseline = {
      subjects: state.subjects.map(copySubject),
      services: state.services.map(copyService)
    };
    state.couponBaseline = state.coupons.map(copyCoupon);

    if (!state.subjects.some((item) => item.id === state.selectedSubjectId) && state.subjects[0]) {
      state.selectedSubjectId = state.subjects[0].id;
    }
    if (!state.services.some((item) => item.id === state.selectedServiceId) && state.services[0]) {
      state.selectedServiceId = state.services[0].id;
    }
    if (!state.coupons.some((item) => item.code === state.selectedCouponCode) && state.coupons[0]) {
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
    state.setupLoaded = true;
    [addSubjectBtn, addServiceBtn, addCouponBtn, saveBtn].forEach((button) => { button.disabled = false; });
    showStatus(`Loaded ${state.subjects.length} subjects, ${state.services.length} lesson types, and ${state.coupons.length} coupon(s).`);
  }

  function importPriceFor(subjectId, format, tier) {
    const matrix = state.pricing.subjectPrices?.[subjectId] || state.pricing.prices || {};
    const value = matrix?.[format]?.[tier];
    return Number.isFinite(Number(value)) ? Number(value) : null;
  }

  function productOptions(row) {
    const requiredCount = row.tier === "pack6" ? 6 : row.tier === "pack12" ? 12 : 0;
    const id = String(row.source.id);
    const matches = window.AcuityImportRules.findPackageMatches(state.acuityImportProducts, id, requiredCount);
    const related = window.AcuityImportRules.findRelatedPackages(state.acuityImportProducts, id);
    const choices = matches.length ? matches : related.length ? related : (state.acuityImportProducts || []).filter((product) => String(product.type).toLowerCase() === "appointments");
    row.productChoices = choices;
    if (row.productID && !choices.some((product) => String(product.id) === String(row.productID))) row.productID = "";
    if (!row.productID && matches.length === 1) row.productID = matches[0].id;
    return `<option value="">Choose package product…</option>${choices.map((item) => `<option value="${escapeHtml(item.id)}"${String(item.id) === String(row.productID) ? " selected" : ""}>${escapeHtml(item.name)}${matches.includes(item) ? "" : " · count needs checking"}</option>`).join("")}`;
  }

  function renderAcuityImport() {
    const rows = state.acuityImportRows;
    if (!rows.length) {
      acuityImportBody.innerHTML = `<p class="acuity-import__notice">Acuity is connected, but it returned no appointment types to import.</p>`;
      acuityImportFooter.hidden = true;
      return;
    }
    const subjects = state.subjects.slice().sort((a, b) => a.name.localeCompare(b.name));
    acuityImportBody.innerHTML = `
      <p class="acuity-import__intro">${rows.length} Acuity appointment type${rows.length === 1 ? "" : "s"} found. Existing mappings are left unchecked and will not change unless you select them. Imported prices update the website and Stripe only; Acuity itself is never changed here.</p>
      <div class="acuity-import__table-wrap"><table class="acuity-import__table"><thead><tr><th>Map</th><th>Acuity item</th><th>Website subject</th><th>Format</th><th>Tier</th><th>Package product</th><th>Price</th></tr></thead><tbody>
      ${rows.map((row, index) => {
        const unsupportedType = row.source.type && row.source.type !== "service";
        const exactSubject = subjects.find((subject) => [subject.name, subject.label].some((name) => String(name || "").trim().toLowerCase() === row.source.category.toLowerCase()));
        const defaultSubject = row.subjectSelection || exactSubject?.id || (row.source.category ? `new:${row.source.category}` : "");
        const productSelect = row.tier === "pack6" || row.tier === "pack12" ? `<select data-import-field="product" aria-label="Package product for ${escapeHtml(row.source.name)}">${productOptions(row)}</select>` : `<span class="muted">Not needed</span>`;
        if (row.tier === "pack6" || row.tier === "pack12") {
          const chosenProduct = (state.acuityImportProducts || []).find((product) => String(product.id) === String(row.productID));
          const requiredCount = row.tier === "pack6" ? 6 : 12;
          const exactProduct = window.AcuityImportRules.isExactPackageProduct(chosenProduct, row.source.id, requiredCount);
          row.priceSource = exactProduct && Number.isFinite(chosenProduct.price) ? { price: chosenProduct.price, label: `${chosenProduct.name} · Acuity product` } : null;
        }
        const sourcePrice = row.priceSource?.price;
        const targetSubjectId = defaultSubject.startsWith("new:") ? "" : defaultSubject;
        const currentWebsitePrice = targetSubjectId
          ? importPriceFor(targetSubjectId, row.format, row.tier)
          : Number(state.pricing.prices?.[row.format]?.[row.tier]);
        const priceInfo = Number.isFinite(sourcePrice)
          ? `<span class="acuity-import__price">Acuity ${sourcePrice.toFixed(2)}<small>${escapeHtml(row.priceSource.label)} · account currency</small><small>Website now: ${Number.isFinite(currentWebsitePrice) ? `EUR ${currentWebsitePrice.toFixed(2)}` : "not set"}</small></span>`
          : `<span class="acuity-import__price">Unavailable<small>${row.tier === "pack6" || row.tier === "pack12" ? "Select an exact package product" : "Acuity has no price"}</small></span>`;
        row.subjectSelection = defaultSubject;
        return `<tr class="${row.existing ? "is-mapped" : ""}" data-import-row="${index}">
          <td><input type="checkbox" data-import-field="include" aria-label="${row.existing ? "Update existing mapping" : "Import mapping"} for ${escapeHtml(row.source.name)}"${row.include ? " checked" : ""}${unsupportedType ? " disabled" : ""}></td>
          <td class="acuity-import__source"><strong>${escapeHtml(row.source.name)}</strong><small>ID ${escapeHtml(row.source.id)}${row.existing ? " · Already mapped" : " · New mapping"}${row.source.category ? ` · ${escapeHtml(row.source.category)}` : ""}${unsupportedType ? ` · ${escapeHtml(row.source.type)} type not supported by this lesson flow` : ""}</small></td>
          <td><select data-import-field="subject" aria-label="Website subject for ${escapeHtml(row.source.name)}"><option value="">Choose subject…</option>${subjects.map((subject) => `<option value="${escapeHtml(subject.id)}"${String(defaultSubject) === String(subject.id) ? " selected" : ""}>${escapeHtml(subjectDisplay(subject))}</option>`).join("")}${row.source.category && !exactSubject ? `<option value="new:${escapeHtml(row.source.category)}"${defaultSubject === `new:${row.source.category}` ? " selected" : ""}>Create “${escapeHtml(row.source.category)}”</option>` : ""}</select></td>
          <td><select data-import-field="format" aria-label="Lesson format for ${escapeHtml(row.source.name)}"><option value="">Choose…</option><option value="oneToOne"${row.format === "oneToOne" ? " selected" : ""}>1:1</option><option value="oneToTwo"${row.format === "oneToTwo" ? " selected" : ""}>1:2</option></select></td>
          <td><select data-import-field="tier" aria-label="Lesson tier for ${escapeHtml(row.source.name)}"><option value="">Choose…</option><option value="trial"${row.tier === "trial" ? " selected" : ""}>Trial</option><option value="single"${row.tier === "single" ? " selected" : ""}>Single</option><option value="pack6"${row.tier === "pack6" ? " selected" : ""}>6-class</option><option value="pack12"${row.tier === "pack12" ? " selected" : ""}>12-class</option></select></td>
          <td>${productSelect}</td>
          <td>${priceInfo}<label class="acuity-import__price-choice"><input type="checkbox" data-import-field="price" aria-label="Import price for ${escapeHtml(row.source.name)}"${row.importPrice ? " checked" : ""}${Number.isFinite(sourcePrice) && !unsupportedType ? "" : " disabled"}> Import</label></td>
        </tr>`;
      }).join("")}
      </tbody></table></div>
      <label class="acuity-import__currency"><input type="checkbox" id="acuityPriceCurrencyConfirm"${state.acuityPriceCurrencyConfirmed ? " checked" : ""}> I have confirmed Acuity uses EUR, the website's currency.</label>
      <p class="acuity-import__notice">Acuity categories and names are suggestions only. Confirm the subject, format, tier, package count, and currency before saving. Acuity prices are in the Acuity account's currency; the website and Stripe use EUR.</p>`;
    acuityImportFooter.hidden = false;
    acuityImportStatus.textContent = "Nothing has been saved yet.";
    saveImportedMappingsBtn.disabled = false;
    saveImportedPricesBtn.disabled = !state.acuityPriceCurrencyConfirmed;
  }

  function readAcuityImportRows() {
    acuityImportBody.querySelectorAll("[data-import-row]").forEach((element) => {
      const row = state.acuityImportRows[Number(element.dataset.importRow)];
      if (!row) return;
      row.include = element.querySelector('[data-import-field="include"]').checked;
      row.subjectSelection = element.querySelector('[data-import-field="subject"]').value;
      row.format = element.querySelector('[data-import-field="format"]').value;
      row.tier = element.querySelector('[data-import-field="tier"]').value;
      row.productID = element.querySelector('[data-import-field="product"]')?.value || "";
      row.importPrice = element.querySelector('[data-import-field="price"]').checked;
      if (row.tier === "trial" || row.tier === "single") {
        row.priceSource = Number.isFinite(row.source.price) ? { price: row.source.price, label: "Acuity appointment price" } : null;
      } else if (row.tier === "pack6" || row.tier === "pack12") {
        const product = row.productChoices?.find((item) => String(item.id) === String(row.productID));
        const requiredCount = row.tier === "pack6" ? 6 : 12;
        const exactProduct = window.AcuityImportRules.isExactPackageProduct(product, row.source.id, requiredCount);
        row.priceSource = exactProduct && Number.isFinite(product.price) ? { price: product.price, label: `${product.name} · Acuity product` } : null;
      } else row.priceSource = null;
    });
    renderAcuityImport();
  }

  async function openAcuityImport() {
    if (state.dirtyTabs.has("services") || state.dirtyTabs.has("subjects") || state.dirtyTabs.has("pricing")) {
      showError("Save or discard your current subject, lesson type, or price edits before opening the Acuity import.");
      return;
    }
    if (!acuityImportDialog.open) {
      acuityImportDialog.showModal();
      state.acuityPriceCurrencyConfirmed = false;
    }
    acuityImportFooter.hidden = true;
    acuityImportBody.innerHTML = `<div class="dashboard-loading"><span class="dashboard-loading__spinner" aria-hidden="true"></span>Loading appointment types and package products…</div>`;
    await runTask(acuityImportBtn, "Loading Acuity", async () => {
      let data;
      try {
        [data] = await Promise.all([api("GET", ACUITY_IMPORT_API), state.pricingBaseline ? Promise.resolve() : loadPricing()]);
      } catch (error) {
        if (window.AcuityImportRules.isConnectionUnavailable(error.message)) {
          acuityImportBody.innerHTML = `<div class="acuity-import__notice" role="status"><strong>Acuity isn’t connected to this environment yet.</strong><br>Connect the right account before importing. Preview uses a separate test account and never the live tutoring account.<br><button class="btn-secondary" id="retryAcuityImportBtn" type="button">Try again</button></div>`;
          acuityImportBody.querySelector("#retryAcuityImportBtn").addEventListener("click", openAcuityImport);
          adminStatus.textContent = "";
          return;
        }
        acuityImportBody.innerHTML = `<div class="acuity-import__error"><strong>Could not load Acuity data.</strong><br>${escapeHtml(error.message)}<br><button class="btn-secondary" id="retryAcuityImportBtn" type="button">Try again</button></div>`;
        acuityImportBody.querySelector("#retryAcuityImportBtn").addEventListener("click", openAcuityImport);
        throw error;
      }
      state.acuityImportProducts = data.products || [];
      state.acuityImportRows = (data.appointmentTypes || []).map((source) => {
        const existing = state.services.find((service) => String(service.appointmentTypeID) === String(source.id));
        const inferred = window.AcuityImportRules.inferLessonDetails(source.name);
        const row = {
          source,
          existing,
          include: false,
          subjectSelection: existing?.subjectId || "",
          format: existing?.format || inferred.format,
          tier: existing?.tier || inferred.tier,
          productID: existing?.productID || "",
          importPrice: false,
          priceSource: null
        };
        if (row.tier === "trial" || row.tier === "single") row.priceSource = Number.isFinite(source.price) ? { price: source.price, label: "Acuity appointment price" } : null;
        return row;
      });
      renderAcuityImport();
      showStatus(`Loaded ${state.acuityImportRows.length} Acuity lesson types for review. Nothing has been changed.`);
    }, { localError: acuityImportStatus });
  }

  function selectedImportSubject(row, subjects) {
    if (row.subjectSelection.startsWith("new:")) {
      const proposedName = row.subjectSelection.slice(4).trim();
      let subject = subjects.find((item) => item.name.toLowerCase() === proposedName.toLowerCase());
      if (!subject) {
        const slugBase = proposedName.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "subject";
        let slug = slugBase;
        let suffix = 2;
        while (subjects.some((item) => item.slug === slug)) slug = `${slugBase}-${suffix++}`;
        subject = { id: newId("subject"), name: proposedName, slug, label: proposedName, note: "", order: Math.max(0, ...subjects.map((item) => Number(item.order) || 0)) + 1, active: true };
        subjects.push(subject);
      }
      return subject;
    }
    return subjects.find((item) => item.id === row.subjectSelection);
  }

  async function saveImportedMappings() {
    readAcuityImportRows();
    const selected = state.acuityImportRows.filter((row) => row.include);
    if (!selected.length) throw new Error("Select at least one lesson type to save its mapping.");
    const subjects = state.subjects.map(copySubject);
    const services = state.services.map(copyService);
    const seen = new Set(services.map((item) => `${item.subjectId}|${item.format}|${item.tier}`));
    const subjectAdds = [];
    for (const row of selected) {
      if (!row.subjectSelection || !row.format || !row.tier) throw new Error(`Complete the subject, format, and tier for “${row.source.name}” before saving.`);
      if (row.tier === "pack6" || row.tier === "pack12") {
        const requiredCount = row.tier === "pack6" ? 6 : 12;
        const product = state.acuityImportProducts.find((item) => String(item.id) === String(row.productID));
        if (!window.AcuityImportRules.isExactPackageProduct(product, row.source.id, requiredCount)) {
          throw new Error(`Choose an Acuity package linked to “${row.source.name}” with exactly ${requiredCount} sessions.`);
        }
      }
      const subject = selectedImportSubject(row, subjects);
      if (!subject) throw new Error(`Choose a valid website subject for “${row.source.name}”.`);
      if (!state.subjects.some((item) => item.id === subject.id)) subjectAdds.push(subject.name);
      const existing = services.find((item) => String(item.appointmentTypeID) === String(row.source.id));
      const collision = `${subject.id}|${row.format}|${row.tier}`;
      if (!existing && seen.has(collision)) throw new Error(`“${row.source.name}” duplicates a subject, format, and tier already mapped. Review the selection before saving.`);
      if (existing) seen.delete(`${existing.subjectId}|${existing.format}|${existing.tier}`);
      if (seen.has(collision)) throw new Error(`Two selected Acuity types map to the same website lesson slot: ${subject.name}, ${priceLabel(row.format, row.tier)}.`);
      seen.add(collision);
      const item = window.AcuityImportRules.mergeAcuityMapping(existing, {
        id: newId("service"), subjectId: subject.id, format: row.format, tier: row.tier,
        label: priceLabel(row.format, row.tier), appointmentTypeID: String(row.source.id),
        productID: row.productID, calendarID: row.source.calendarIDs?.[0] || "", order: services.length + 1
      });
      const index = services.findIndex((service) => service.id === item.id);
      if (index >= 0) services[index] = item;
      else services.unshift(item);
    }
    const result = await saveBookingWithRevisionCheck(subjects, services);
    state.subjects = result.subjects || subjects;
    state.services = result.services || services;
    state.bookingRevision = result.revision || state.bookingRevision;
    state.bookingBaseline = { subjects: state.subjects.map(copySubject), services: state.services.map(copyService) };
    renderServiceSubjectOptions();
    renderServiceSubjectFilter();
    renderSubjectList();
    renderServiceList();
    fillSubjectEditor(currentSubject() || {});
    fillServiceEditor(currentService() || {});
    state.acuityImportRows.filter((row) => row.include).forEach((row) => {
      row.include = false;
      row.existing = state.services.find((item) => String(item.appointmentTypeID) === String(row.source.id));
      row.subjectSelection = row.existing?.subjectId || state.subjects.find((subject) => subject.name.toLowerCase() === row.source.category.toLowerCase())?.id || row.subjectSelection;
    });
    renderAcuityImport();
    acuityImportStatus.textContent = `${selected.length} mapping${selected.length === 1 ? "" : "s"} saved${subjectAdds.length ? `; ${new Set(subjectAdds).size} new subject${new Set(subjectAdds).size === 1 ? "" : "s"} added` : ""}.`;
    showStatus(`Acuity mappings saved. ${selected.length} lesson type${selected.length === 1 ? "" : "s"} now connected to the website.`);
  }

  async function saveImportedPrices() {
    readAcuityImportRows();
    if (!state.acuityPriceCurrencyConfirmed) throw new Error("Confirm that the Acuity account currency is EUR before applying prices to the website.");
    const selected = state.acuityImportRows.filter((row) => row.importPrice);
    if (!selected.length) throw new Error("Select one or more available Acuity prices to apply.");
    const updates = new Map();
    for (const row of selected) {
      if (!row.subjectSelection || !row.format || !row.tier) throw new Error(`Complete the subject, format, and tier for the price from “${row.source.name}”.`);
      if (row.subjectSelection.startsWith("new:") && !state.subjects.some((subject) => subject.name.toLowerCase() === row.subjectSelection.slice(4).toLowerCase())) {
        throw new Error(`Save the new subject mapping for “${row.source.name}” before applying its price.`);
      }
      const subject = state.subjects.find((item) => item.id === row.subjectSelection);
      if (!subject) throw new Error(`Choose a saved subject for the price from “${row.source.name}”.`);
      if (row.tier === "pack6" || row.tier === "pack12") {
        const requiredCount = row.tier === "pack6" ? 6 : 12;
        const product = state.acuityImportProducts.find((item) => String(item.id) === String(row.productID));
        if (!window.AcuityImportRules.isExactPackageProduct(product, row.source.id, requiredCount)) {
          throw new Error(`Choose an Acuity package linked to “${row.source.name}” with exactly ${requiredCount} sessions before importing its price.`);
        }
      }
      if (!row.priceSource || !Number.isFinite(row.priceSource.price)) throw new Error(`A price could not be read for “${row.source.name}”.`);
      const key = `${subject.id}|${row.format}|${row.tier}`;
      if (updates.has(key) && updates.get(key).value !== row.priceSource.price) throw new Error(`The selected Acuity types have different prices for the same website lesson slot (${subject.name}, ${priceLabel(row.format, row.tier)}).`);
      updates.set(key, { subject, format: row.format, tier: row.tier, value: row.priceSource.price });
    }
    const draft = JSON.parse(JSON.stringify(state.pricing));
    draft.subjectPrices = draft.subjectPrices || {};
    for (const { subject, format, tier, value } of updates.values()) {
      if (!draft.subjectPrices[subject.id]) draft.subjectPrices[subject.id] = JSON.parse(JSON.stringify(draft.prices));
      draft.subjectPrices[subject.id][format][tier] = value;
    }
    const data = await savePricingWithRevisionCheck(draft);
    state.pricing = data.pricing || draft;
    state.pricingBaseline = pricingContent(state.pricing);
    state.pricingServices = data.services || state.pricingServices;
    renderPricing();
    state.acuityImportRows.filter((row) => row.importPrice).forEach((row) => { row.importPrice = false; });
    renderAcuityImport();
    acuityImportStatus.textContent = `${updates.size} website price${updates.size === 1 ? "" : "s"} applied. Acuity prices were not changed.`;
    showStatus(`Website and Stripe prices updated for ${updates.size} selected lesson slot${updates.size === 1 ? "" : "s"}. Acuity was not changed.`);
  }

  acuityImportBtn.addEventListener("click", openAcuityImport);
  acuityImportBody.addEventListener("change", (event) => {
    if (event.target.id === "acuityPriceCurrencyConfirm") {
      state.acuityPriceCurrencyConfirmed = event.target.checked;
      saveImportedPricesBtn.disabled = !state.acuityPriceCurrencyConfirmed;
      return;
    }
    if (event.target.matches("select, input[type='checkbox']")) {
      const shouldResetPrice = event.target.matches("select");
      readAcuityImportRows();
      if (shouldResetPrice) {
        const row = event.target.closest("[data-import-row]");
        const index = Number(row?.dataset.importRow);
        if (state.acuityImportRows[index]) {
          state.acuityImportRows[index].importPrice = false;
          renderAcuityImport();
        }
      }
    }
  });
  saveImportedMappingsBtn.addEventListener("click", () => runTask(saveImportedMappingsBtn, "Saving mappings", saveImportedMappings, { localError: acuityImportStatus }));
  saveImportedPricesBtn.addEventListener("click", () => runTask(saveImportedPricesBtn, "Applying prices", saveImportedPrices, { localError: acuityImportStatus }));

  function ensureSelectedAfterAdd(collection, item, idKey) {
    collection.unshift(item);
    state[idKey] = item.id || item.code;
  }

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => setTab(button.dataset.tab));
  });

  async function refreshCurrent() {
    if (["subjects", "services", "coupons"].includes(state.tab)) return load();
    if (state.tab === "operations") return loadOperations();
    if (state.tab === "pricing") return loadPricing();
    if (state.tab === "templates") return loadTemplates();
    if (state.tab === "proofreading-templates") return loadProofreadingTemplates();
  }

  refreshBtn.addEventListener("click", () => {
    if (state.dirtyTabs.has(state.tab)) {
      showError("You have unsaved edits. Save them or use Discard edits before refreshing.");
      return;
    }
    runTask(refreshBtn, "Refreshing", refreshCurrent);
  });
  discardBtn.addEventListener("click", () => runTask(discardBtn, "Discarding edits", async () => {
    await refreshCurrent();
    clearDirty();
    showStatus("Unsaved edits discarded. The latest saved values are shown.");
  }));
  backupDownloadBtn.addEventListener("click", () => {
    if (!window.confirm("This backup contains private client, booking, and payment records. Download it only to a secure device.")) return;
    runTask(backupDownloadBtn, "Preparing backup", async () => {
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
    });
  });
  backupRestoreFile.addEventListener("change", () => {
    const file = backupRestoreFile.files?.[0];
    backupRestoreBtn.disabled = !file;
    showError(file && file.size > 3.5 * 1024 * 1024 ? "This backup is too large to restore in the dashboard. Keep the original file and ask for help restoring it securely." : "");
    if (file && file.size > 3.5 * 1024 * 1024) backupRestoreBtn.disabled = true;
  });
  backupRestoreBtn.addEventListener("click", () => {
    const file = backupRestoreFile.files?.[0];
    if (!file) return;
    const section = backupRestoreSection.value;
    const sectionName = backupRestoreSection.selectedOptions[0]?.textContent || section;
    if (!window.confirm(`Restore ${sectionName}? This replaces the current ${sectionName.toLowerCase()} from the selected backup.`)) return;
    if (window.prompt('Type RESTORE to confirm. Download a fresh backup first.') !== "RESTORE") return;

    runTask(backupRestoreBtn, "Restoring backup", async () => {
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
    }).finally(() => {
      backupRestoreBtn.disabled = !backupRestoreFile.files?.[0];
    });
  });
  logoutBtn.addEventListener("click", () => {
    if (state.dirtyTabs.size && !window.confirm("You have unsaved edits. Sign out and discard them?")) return;
    state.dirtyTabs.clear();
    sessionStorage.removeItem("finbarAdminKey");
    sessionStorage.removeItem(ADMIN_LAST_ACTIVITY_KEY);
    window.location.replace("/admin-login.html");
  });

  addSubjectBtn.addEventListener("click", () => {
    if (!setTab("subjects")) return;
    if (state.dirtyTabs.has("subjects")) return showError("Save or discard the current subject before adding another.");
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
    markDirty("subjects");
  });

  addServiceBtn.addEventListener("click", () => {
    if (!setTab("services")) return;
    if (state.dirtyTabs.has("services")) return showError("Save or discard the current lesson type before adding another.");
    const subjects = [currentSubject(), ...state.subjects].filter((subject, index, list) => subject && list.findIndex((item) => item?.id === subject.id) === index);
    const combinations = ["oneToOne", "oneToTwo"].flatMap((format) => ["trial", "single", "pack6", "pack12"].map((tier) => ({ format, tier })));
    const missing = subjects.map((subject) => ({ subject, combination: combinations.find(({ format, tier }) => !state.services.some((service) => service.subjectId === subject.id && service.format === format && service.tier === tier)) })).find((item) => item.combination);
    if (!missing) return showError("Every subject already has all eight lesson types. Edit an existing lesson type, or add a new subject first.");
    const service = copyService({
      id: newId("service"),
      subjectId: missing.subject.id,
      format: missing.combination.format,
      tier: missing.combination.tier,
      label: priceLabel(missing.combination.format, missing.combination.tier),
      calendarID: "",
      active: true
    });
    ensureSelectedAfterAdd(state.services, service, "selectedServiceId");
    fillServiceEditor(service);
    renderServiceSubjectOptions();
    renderServiceList();
    markDirty("services");
  });

  addCouponBtn.addEventListener("click", () => {
    if (!setTab("coupons")) return;
    if (state.dirtyTabs.has("coupons")) return showError("Save or discard the current coupon before adding another.");
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
    markDirty("coupons");
  });

  deleteSubjectBtn.addEventListener("click", () => {
    if (!state.selectedSubjectId) return;
    const linkedLessons = state.services.filter((service) => service.subjectId === state.selectedSubjectId).length;
    if (!window.confirm(`Remove ${currentSubject()?.name || "this subject"}${linkedLessons ? ` and its ${linkedLessons} linked lesson type${linkedLessons === 1 ? "" : "s"}` : ""}? This takes effect only when you save changes.`)) return;
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
    markDirty("subjects");
  });

  deleteServiceBtn.addEventListener("click", () => {
    if (!state.selectedServiceId) return;
    if (!window.confirm("Remove this lesson type? It will not be removed until you save changes.")) return;
    state.services = state.services.filter((service) => service.id !== state.selectedServiceId);
    state.selectedServiceId = state.services[0]?.id || "";
    renderServiceList();
    fillServiceEditor(currentService() || {});
    markDirty("services");
  });

  deleteCouponBtn.addEventListener("click", () => {
    const coupon = currentCoupon();
    if (!coupon) return;
    if (!window.confirm(`Remove coupon ${coupon.code}? It will not be removed until you save changes.`)) return;
    state.coupons = state.coupons.filter((item) => item.code !== coupon.code);
    state.selectedCouponCode = state.coupons[0]?.code || "";
    renderCoupons();
    fillCouponEditor(currentCoupon() || {});
    markDirty("coupons");
  });

  saveBtn.addEventListener("click", () => runTask(saveBtn, "Saving changes", async () => {
    if (state.tab === "coupons") {
      const coupon = buildCouponPayload();
      if (state.coupons.length && (!coupon.code || !Number.isFinite(coupon.percent) || coupon.percent < 1 || coupon.percent > 100)) {
        throw new Error("Enter a coupon code and a discount between 1% and 100%.");
      }
      const nextCoupons = [...state.coupons];
      if (state.coupons.length) {
        coupon.code = coupon.code.toUpperCase();
        coupon.percent = Math.round(coupon.percent);
        coupon.packageKeys = coupon.packageKeys.length ? coupon.packageKeys : state.packageCatalog.map((item) => item.key);
        const originalCode = state.selectedCouponCode.toUpperCase();
        if (nextCoupons.some((item) => item.code === coupon.code && item.code !== originalCode)) {
          throw new Error("That coupon code already exists. Choose a different code.");
        }
        const index = nextCoupons.findIndex((item) => item.code === originalCode || item.code === coupon.code);
        if (index >= 0) nextCoupons[index] = coupon;
        else nextCoupons.unshift(coupon);
      }
      const result = await saveCouponsWithRevisionCheck(nextCoupons);
      state.coupons = result.coupons || nextCoupons;
      state.couponRevision = result._revision || state.couponRevision;
      state.couponBaseline = state.coupons.map(copyCoupon);
      state.selectedCouponCode = state.coupons.length ? coupon.code : "";
      renderCoupons();
      fillCouponEditor(currentCoupon() || {});
    } else {
      const subjects = [...state.subjects];
      const services = [...state.services];
      if (state.tab === "subjects") {
        const subject = buildSubjectPayload();
        if (state.selectedSubjectId) {
          if (!subject.name) throw new Error("Enter a subject name before saving.");
          const index = subjects.findIndex((item) => item.id === subject.id);
          if (index >= 0) subjects[index] = subject;
          else subjects.unshift(subject);
          state.selectedSubjectId = subject.id;
        }
      } else if (state.tab === "services") {
        const service = buildServicePayload();
        if (state.selectedServiceId) {
          if (!service.subjectId || !service.format || !service.tier) throw new Error("Choose a subject, lesson format, and tier before saving.");
          if (services.some((item) => item.id !== service.id && item.subjectId === service.subjectId && item.format === service.format && item.tier === service.tier)) {
            throw new Error("That subject already has this lesson format and tier. Edit its existing lesson type instead.");
          }
          const index = services.findIndex((item) => item.id === service.id);
          if (index >= 0) services[index] = service;
          else services.unshift(service);
          state.selectedServiceId = service.id;
        }
      } else return;
      const result = await saveBookingWithRevisionCheck(subjects, services);
      state.subjects = result.subjects || subjects;
      state.services = result.services || services;
      state.packageCatalog = result.packageCatalog || state.packageCatalog;
      state.bookingRevision = result.revision || state.bookingRevision;
      state.bookingBaseline = {
        subjects: state.subjects.map(copySubject),
        services: state.services.map(copyService)
      };
      renderServiceSubjectOptions();
      renderServiceSubjectFilter();
      renderSubjectList();
      renderServiceList();
      fillSubjectEditor(currentSubject() || {});
      fillServiceEditor(currentService() || {});
    }
    clearDirty();
    showStatus(state.tab === "coupons" ? "Coupon changes saved for future checkouts." : "Booking setup saved. Check the customer site to confirm this subject or lesson is displayed as intended.");
  }));

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
  refreshOperationsBtn.addEventListener("click", () => runTask(refreshOperationsBtn, "Loading bookings", loadOperations));
  refreshPricingBtn.addEventListener("click", () => {
    if (state.dirtyTabs.has("pricing")) return showError("Save or discard your pricing edits before refreshing.");
    runTask(refreshPricingBtn, "Loading prices", loadPricing);
  });
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
    markDirty("pricing");
  });
  savePricingBtn.addEventListener("click", () => runTask(savePricingBtn, "Saving prices", async () => {
      capturePricingEditor();
      const data = await savePricingWithRevisionCheck(state.pricing);
      state.pricing = data.pricing || state.pricing;
      state.pricingBaseline = pricingContent(state.pricing);
      state.pricingServices = data.services || state.pricingServices;
      renderPricing();
      const mapped = state.pricingServices.filter((service) => service.appointmentTypeID);
      const unverified = mapped.filter((service) => !Number.isFinite(service.acuityPrice)).length;
      const mismatches = mapped.filter((service) => service.matchesAcuity === false).length;
      clearDirty("pricing");
      showStatus(`Saved for new website quotes and Stripe checkouts. Acuity is not automatically updated.${mismatches ? ` ${mismatches} price mismatch${mismatches === 1 ? "" : "es"} need attention.` : ""}${unverified ? ` ${unverified} Acuity price${unverified === 1 ? " could not be verified." : "s could not be verified."}` : ""}`);
  }));

  [templateSubjectInput, templateHeadingInput, templateMessageInput, templateCtaInput, templateNoteInput].forEach((input) => input.addEventListener("input", renderEmailPreview));
  saveTemplateBtn.addEventListener("click", () => runTask(saveTemplateBtn, "Saving template", async () => {
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
    clearDirty("templates");
    showStatus("Email template saved. Future customer emails will use this wording.");
    renderTemplates();
    fillTemplateEditor();
  }));
  resetTemplateBtn.addEventListener("click", () => runTask(resetTemplateBtn, "Restoring template", async () => {
    if (!window.confirm("Reset this email template to Finbar's default wording?")) return;
    const data = await api("POST", TEMPLATE_API, { kind: state.selectedTemplateKind });
    state.templates = data.templates || state.templates;
    state.templatesRevision = data._revision || state.templatesRevision;
    clearDirty("templates");
    showStatus("Email template restored to the default wording.");
    renderTemplates();
    fillTemplateEditor();
  }));

  [proofTemplateSubjectInput, proofTemplateHeadingInput, proofTemplateMessageInput, proofTemplateCtaInput, proofTemplateNoteInput].forEach((input) => input.addEventListener("input", renderProofreadingEmailPreview));
  saveProofTemplateBtn.addEventListener("click", () => runTask(saveProofTemplateBtn, "Saving template", async () => {
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
    clearDirty("proofreading-templates");
    showStatus("Proofreading email template saved. Future proofreading emails will use this wording.");
    renderProofreadingTemplates();
    fillProofreadingTemplateEditor();
  }));
  resetProofTemplateBtn.addEventListener("click", () => runTask(resetProofTemplateBtn, "Restoring template", async () => {
    if (!window.confirm("Reset this proofreading email template to Finbar's default wording?")) return;
    const data = await api("POST", PROOF_TEMPLATE_API, { kind: state.selectedProofreadingTemplateKind });
    state.proofreadingTemplates = data.templates || state.proofreadingTemplates;
    state.proofreadingRevision = data._revision || state.proofreadingRevision;
    clearDirty("proofreading-templates");
    showStatus("Proofreading email template restored to the default wording.");
    renderProofreadingTemplates();
    fillProofreadingTemplateEditor();
  }));

  const noDirtyTracking = new Set(["operationSearchInput", "subjectSearchInput", "serviceSearchInput", "serviceSubjectFilter", "couponSearchInput", "priceSubjectSelect"]);
  window.addEventListener("beforeunload", (event) => {
    if (!state.dirtyTabs.size) return;
    event.preventDefault();
    event.returnValue = "";
  });
  document.querySelectorAll(".admin-tab-panel").forEach((panel) => {
    panel.addEventListener("input", (event) => {
      if (event.target.matches("input, textarea, select") && !noDirtyTracking.has(event.target.id) && ["pricing", "templates", "proofreading-templates", "subjects", "services", "coupons"].includes(panel.dataset.panel)) markDirty(panel.dataset.panel);
    });
    panel.addEventListener("change", (event) => {
      if (event.target.matches("input, textarea, select") && !noDirtyTracking.has(event.target.id) && ["pricing", "templates", "proofreading-templates", "subjects", "services", "coupons"].includes(panel.dataset.panel)) markDirty(panel.dataset.panel);
    });
  });

  setTab("operations");
  load().catch((error) => {
    showStatus("");
    showError(error.message);
  });
})();
