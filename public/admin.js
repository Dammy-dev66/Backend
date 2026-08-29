(() => {
  const BOOKING_API = "/api/booking-config";
  const COUPON_API = "/api/admin/coupons";

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
    tab: "subjects",
    subjects: [],
    services: [],
    coupons: [],
    packageCatalog: [],
    selectedSubjectId: "",
    selectedServiceId: "",
    selectedCouponCode: "",
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

  refreshBtn.addEventListener("click", () => load().catch((error) => showError(error.message)));

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

  adminKeyInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      load().catch((error) => showError(error.message));
    }
  });

  setTab("subjects");
  load().catch((error) => {
    showStatus("");
    showError(error.message);
  });
})();
