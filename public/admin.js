(() => {
  const BOOKING_API = "/api/admin/booking-config";
  const COUPON_API = "/api/admin/coupons";

  const adminKeyInput = document.createElement("input");
  adminKeyInput.type = "password";
  adminKeyInput.placeholder = "Admin key";
  adminKeyInput.className = "admin-key-input";
  adminKeyInput.autocomplete = "current-password";

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

  const subjectNameInput = document.getElementById("subjectNameInput");
  const subjectSlugInput = document.getElementById("subjectSlugInput");
  const subjectLabelInput = document.getElementById("subjectLabelInput");
  const subjectOrderInput = document.getElementById("subjectOrderInput");
  const subjectActiveInput = document.getElementById("subjectActiveInput");
  const subjectNoteInput = document.getElementById("subjectNoteInput");
  const subjectStatus = document.getElementById("subjectStatus");
  const deleteSubjectBtn = document.getElementById("deleteSubjectBtn");

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
  const serviceStatus = document.getElementById("serviceStatus");
  const deleteServiceBtn = document.getElementById("deleteServiceBtn");

  const codeInput = document.getElementById("codeInput");
  const percentInput = document.getElementById("percentInput");
  const labelInput = document.getElementById("labelInput");
  const messageInput = document.getElementById("messageInput");
  const activeInput = document.getElementById("activeInput");

  document.querySelector(".admin-toolbar").prepend(adminKeyInput);

  const state = {
    subjects: [],
    services: [],
    coupons: [],
    packageCatalog: [],
    selectedSubjectId: "",
    selectedServiceId: "",
    selectedCouponCode: ""
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

  function selectedPackageKeys() {
    return Array.from(packageList.querySelectorAll("input[type='checkbox']:checked")).map((input) => input.value);
  }

  function renderPackageList() {
    packageList.innerHTML = state.packageCatalog.map((item) => `
      <label class="package-check">
        <input type="checkbox" value="${item.key}">
        <span>${item.label}</span>
      </label>
    `).join("");
  }

  function copySubject(subject) {
    return {
      id: subject.id || newId("subject"),
      name: subject.name || "",
      slug: subject.slug || "",
      label: subject.label || "",
      note: subject.note || "",
      order: Number.isFinite(Number(subject.order)) ? Number(subject.order) : 1,
      active: subject.active !== false
    };
  }

  function copyService(service) {
    return {
      id: service.id || newId("service"),
      subjectId: service.subjectId || "",
      format: service.format || "oneToOne",
      tier: service.tier || "trial",
      label: service.label || "",
      appointmentTypeID: service.appointmentTypeID || "",
      productID: service.productID || "",
      calendarID: service.calendarID || "",
      bookingLink: service.bookingLink || "",
      note: service.note || "",
      order: Number.isFinite(Number(service.order)) ? Number(service.order) : 1,
      active: service.active !== false
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

  function selectedSubject() {
    return state.subjects.find((item) => item.id === state.selectedSubjectId) || null;
  }

  function selectedService() {
    return state.services.find((item) => item.id === state.selectedServiceId) || null;
  }

  function selectedCoupon() {
    return state.coupons.find((item) => item.code === state.selectedCouponCode) || null;
  }

  function fillSubjectEditor(subject) {
    const record = copySubject(subject || {});
    subjectNameInput.value = record.name;
    subjectSlugInput.value = record.slug;
    subjectLabelInput.value = record.label;
    subjectOrderInput.value = record.order || "";
    subjectActiveInput.checked = record.active !== false;
    subjectNoteInput.value = record.note;
    subjectStatus.textContent = record.id ? (record.active ? "Active" : "Inactive") : "";
  }

  function fillServiceEditor(service) {
    const record = copyService(service || {});
    serviceSubjectInput.value = record.subjectId || "";
    serviceFormatInput.value = record.format || "oneToOne";
    serviceTierInput.value = record.tier || "trial";
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
    const record = copyCoupon(coupon || {});
    codeInput.value = record.code;
    percentInput.value = record.percent ?? "";
    labelInput.value = record.label;
    messageInput.value = record.message;
    activeInput.checked = record.active !== false;

    const keys = new Set(record.packageKeys || []);
    packageList.querySelectorAll("input[type='checkbox']").forEach((input) => {
      input.checked = keys.has(input.value) || keys.has("*");
    });
  }

  function renderSubjectList() {
    subjectList.innerHTML = "";

    if (!state.subjects.length) {
      subjectList.innerHTML = `<p class="muted">No subjects saved yet.</p>`;
      return;
    }

    state.subjects
      .slice()
      .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0) || a.name.localeCompare(b.name))
      .forEach((subject) => {
        const row = document.createElement("button");
        row.type = "button";
        row.className = `record-row${subject.id === state.selectedSubjectId ? " active" : ""}`;
        const serviceCount = state.services.filter((service) => service.subjectId === subject.id).length;
        const mappedCount = state.services.filter((service) => service.subjectId === subject.id && (service.appointmentTypeID || service.bookingLink)).length;
        row.innerHTML = `
          <strong>${subject.name}</strong>
          <span>${subject.label || subject.name}${subject.active === false ? " - inactive" : ""}</span>
          <small>${serviceCount} lesson type(s) · ${mappedCount} mapped</small>
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
    serviceList.innerHTML = "";

    if (!state.services.length) {
      serviceList.innerHTML = `<p class="muted">No lesson types saved yet.</p>`;
      return;
    }

    state.services
      .slice()
      .sort((a, b) => {
        const subjectA = state.subjects.find((subject) => subject.id === a.subjectId);
        const subjectB = state.subjects.find((subject) => subject.id === b.subjectId);
        return (Number(subjectA?.order) || 0) - (Number(subjectB?.order) || 0)
          || (subjectA?.name || "").localeCompare(subjectB?.name || "")
          || a.format.localeCompare(b.format)
          || a.tier.localeCompare(b.tier);
      })
      .forEach((service) => {
        const row = document.createElement("button");
        row.type = "button";
        row.className = `record-row${service.id === state.selectedServiceId ? " active" : ""}`;
        const subject = state.subjects.find((item) => item.id === service.subjectId);
        row.innerHTML = `
          <strong>${subject?.name || "Unlinked subject"} · ${service.label || `${service.format} / ${service.tier}`}</strong>
          <span>${service.format === "oneToTwo" ? "Tutor + two students" : "Tutor + one student"} · ${service.tier}</span>
          <small>${service.appointmentTypeID ? `Acuity ID ${service.appointmentTypeID}` : "Needs Acuity ID"}${service.productID ? ` · Product ${service.productID}` : ""}${service.active === false ? " · inactive" : ""}</small>
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
    couponList.innerHTML = "";

    if (!state.coupons.length) {
      couponList.innerHTML = `<p class="muted">No coupons saved yet.</p>`;
      return;
    }

    state.coupons.forEach((coupon, index) => {
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
      .map((subject) => `<option value="${subject.id}">${subject.name}${subject.active === false ? " (inactive)" : ""}</option>`)
      .join("");

    if (current) {
      serviceSubjectInput.value = current;
    } else if (!serviceSubjectInput.value && state.subjects[0]) {
      serviceSubjectInput.value = state.subjects[0].id;
    }
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
    const edited = copySubject(selectedSubject() || { id: state.selectedSubjectId });
    edited.name = subjectNameInput.value.trim();
    edited.slug = subjectSlugInput.value.trim();
    edited.label = subjectLabelInput.value.trim();
    edited.order = Number(subjectOrderInput.value || 0) || 1;
    edited.active = subjectActiveInput.checked;
    edited.note = subjectNoteInput.value.trim();
    if (!edited.slug && edited.name) {
      edited.slug = edited.name.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    }
    return edited;
  }

  function buildServicePayload() {
    const edited = copyService(selectedService() || { id: state.selectedServiceId });
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
    const edited = copyCoupon(selectedCoupon() || {});
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

    renderPackageList();
    renderServiceSubjectOptions();
    renderSubjectList();
    renderServiceList();
    renderCoupons();

    if (state.subjects.length && !state.selectedSubjectId) {
      state.selectedSubjectId = state.subjects[0].id;
    }
    if (state.services.length && !state.selectedServiceId) {
      state.selectedServiceId = state.services[0].id;
    }
    if (state.coupons.length && !state.selectedCouponCode) {
      state.selectedCouponCode = state.coupons[0].code;
    }

    fillSubjectEditor(selectedSubject() || state.subjects[0] || {});
    fillServiceEditor(selectedService() || state.services[0] || {});
    fillCouponEditor(selectedCoupon() || state.coupons[0] || {});

    renderSubjectList();
    renderServiceList();
    renderCoupons();
    showStatus(`Loaded ${state.subjects.length} subjects, ${state.services.length} lesson types, and ${state.coupons.length} coupon(s).`);
  }

  addSubjectBtn.addEventListener("click", () => {
    const subject = copySubject({
      id: newId("subject"),
      name: "New subject",
      slug: "new-subject",
      label: "New subject",
      order: state.subjects.length + 1,
      active: true
    });
    state.subjects.unshift(subject);
    state.selectedSubjectId = subject.id;
    renderSubjectList();
    fillSubjectEditor(subject);
    renderServiceSubjectOptions();
  });

  addServiceBtn.addEventListener("click", () => {
    const fallbackSubject = selectedSubject() || state.subjects[0] || { id: "", name: "" };
    const service = copyService({
      id: newId("service"),
      subjectId: fallbackSubject.id,
      format: "oneToOne",
      tier: "trial",
      label: "Tutor + one student - Trial class",
      calendarID: "14289294",
      active: true
    });
    state.services.unshift(service);
    state.selectedServiceId = service.id;
    renderServiceSubjectOptions();
    renderServiceList();
    fillServiceEditor(service);
  });

  addCouponBtn.addEventListener("click", () => {
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
    fillSubjectEditor(selectedSubject() || {});
    fillServiceEditor(selectedService() || {});
  });

  deleteServiceBtn.addEventListener("click", () => {
    if (!state.selectedServiceId) return;
    state.services = state.services.filter((service) => service.id !== state.selectedServiceId);
    state.selectedServiceId = state.services[0]?.id || "";
    renderServiceList();
    fillServiceEditor(selectedService() || {});
  });

  saveBtn.addEventListener("click", async () => {
    showError("");
    try {
      const subject = buildSubjectPayload();
      const service = buildServicePayload();
      const coupon = buildCouponPayload();

      if (subject.name) {
        const existingIndex = state.subjects.findIndex((item) => item.id === subject.id);
        if (existingIndex >= 0) state.subjects[existingIndex] = subject;
        else state.subjects.unshift(subject);
        state.selectedSubjectId = subject.id;
      }

      if (service.subjectId && service.format && service.tier) {
        const existingIndex = state.services.findIndex((item) => item.id === service.id);
        if (existingIndex >= 0) state.services[existingIndex] = service;
        else state.services.unshift(service);
        state.selectedServiceId = service.id;
      }

      if (coupon.code && Number.isFinite(coupon.percent) && coupon.percent > 0) {
        coupon.code = coupon.code.toUpperCase();
        coupon.percent = Math.max(1, Math.min(100, Math.round(coupon.percent)));
        coupon.packageKeys = coupon.packageKeys.length ? coupon.packageKeys : state.packageCatalog.map((item) => item.key);

        const originalCode = state.selectedCouponCode ? state.selectedCouponCode.toUpperCase() : "";
        const existingIndex = state.coupons.findIndex((item) => item.code === originalCode || item.code === coupon.code);
        if (existingIndex >= 0) {
          state.coupons[existingIndex] = coupon;
        } else {
          state.coupons.unshift(coupon);
        }
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
      fillSubjectEditor(selectedSubject() || state.subjects[0] || {});
      fillServiceEditor(selectedService() || state.services[0] || {});
      fillCouponEditor(selectedCoupon() || state.coupons[0] || {});

      showStatus("Dashboard settings saved.");
    } catch (error) {
      showError(error.message);
    }
  });

  refreshBtn.addEventListener("click", () => load().catch((error) => showError(error.message)));

  [subjectNameInput, subjectSlugInput, subjectLabelInput, subjectOrderInput, subjectActiveInput, subjectNoteInput].forEach((input) => {
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

  adminKeyInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      load().catch((error) => showError(error.message));
    }
  });

  load().catch((error) => {
    showStatus("");
    showError(error.message);
  });
})();
