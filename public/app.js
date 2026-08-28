const BACKEND_URL = location.origin.includes("localhost")
  ? "https://backend-ymlj.vercel.app"
  : location.origin;
const OWNER_ID = "39765601";
const CALENDAR_ID = 14289294;
const STUDENT_NAME_FIELD_ID = 18796496;

const DEFAULT_CLASS_DATA = [
  subject("AP Psychology", {
    oneToOne: { trial: 95402082, single: 95401962, pack6: [95402039, 2253280], pack12: [95402055, 2253278] },
    oneToTwo: { trial: 95402146, single: 95402102, pack6: [95402119, 2253250], pack12: [95402129, 2253284] }
  }),
  subject("Elegant Essays", {
    oneToOne: { trial: 96953095, single: 96953069, pack6: [96953131, 2260520], pack12: [96953139, 2260521] },
    oneToTwo: { trial: 96953108, single: 96953086, pack6: [96953156, 2260522], pack12: [96953174, 2260523] }
  }),
  subject("English Language & Composition", {
    oneToOne: { trial: 96938198, single: 96938134, pack6: [96938268, 2260524], pack12: [96938304, 2260525] },
    oneToTwo: { trial: 96938230, single: 96938155, pack6: [96938331, 2260526], pack12: [96938344, 2260528] }
  }),
  subject("English Literature", {
    oneToOne: { trial: 96938820, single: 96938767, pack6: [96938876, 2260529], pack12: [96938892, 2260531] },
    oneToTwo: { trial: 96938841, single: 96938789, pack6: [96938926, 2260532], pack12: [96938972, 2260533] }
  }),
  subject("Essay Writing & College Apps", {
    oneToOne: { trial: 96952718, single: 96952697, pack6: [96952741, 2260534], pack12: [96952750, 2260535] },
    oneToTwo: { trial: 96952729, single: 96952707, pack6: [96952763, 2260536], pack12: [96952778, 2260537] }
  })
];
let CLASS_DATA = DEFAULT_CLASS_DATA.slice();

const FORMATS = [
  { key: "oneToOne", label: "Tutor + one student", price: { trial: 25, single: 50, pack6: 264, pack12: 456 } },
  { key: "oneToTwo", label: "Tutor + two students", price: { trial: 35, single: 70, pack6: 360, pack12: 648 } }
];

const TIERS = [
  { key: "trial", label: "Trial class", sessions: 1, needsPackage: false },
  { key: "single", label: "Single lesson", sessions: 1, needsPackage: false },
  { key: "pack6", label: "6-class package", sessions: 6, needsPackage: true },
  { key: "pack12", label: "12-class package", sessions: 12, needsPackage: true }
];

const state = {
  subjectIndex: 0,
  formatKey: "oneToOne",
  tierKey: "trial",
  packageMode: "redeem",
  appointmentTypeID: null,
  productID: null,
  certificate: "",
  packageEmail: "",
  backUrl: "",
  returnSource: "",
  returnOrderID: "",
  remaining: 1,
  selected: [],
  scheduleData: [],
  currentMonth: new Date(),
  activeDate: null
};

function subject(name, options) {
  return { name, options };
}

function safeId(value) {
  return String(value || "").trim();
}

function convertBookingConfigToClassData(config) {
  if (!config || !Array.isArray(config.subjects) || !Array.isArray(config.services)) {
    return DEFAULT_CLASS_DATA.slice();
  }

  const servicesBySubject = new Map();
  config.services.forEach((service) => {
    if (service.active === false) {
      return;
    }
    const subjectId = service.subjectId;
    if (!servicesBySubject.has(subjectId)) {
      servicesBySubject.set(subjectId, []);
    }
    servicesBySubject.get(subjectId).push(service);
  });

  return config.subjects
    .filter((item) => item.active !== false)
    .slice()
    .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0) || a.name.localeCompare(b.name))
    .map((item) => {
      const options = {
        oneToOne: {},
        oneToTwo: {}
      };

      const subjectServices = servicesBySubject.get(item.id) || [];
      subjectServices.forEach((service) => {
        const appointmentTypeID = safeId(service.appointmentTypeID);
        const productID = safeId(service.productID);
        const value = productID ? [appointmentTypeID, productID] : appointmentTypeID;
        if (options[service.format]) {
          options[service.format][service.tier] = value;
        }
      });

      return subject(item.name, options);
    });
}

async function loadBookingConfig() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/booking-config`);
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.ok && Array.isArray(data.subjects) && Array.isArray(data.services)) {
      CLASS_DATA = convertBookingConfigToClassData(data);
    }
  } catch {
    CLASS_DATA = DEFAULT_CLASS_DATA.slice();
  }
}

function $(id) {
  return document.getElementById(id);
}

function selectedSubject() {
  return CLASS_DATA[state.subjectIndex];
}

function selectedFormat() {
  return FORMATS.find((format) => format.key === state.formatKey);
}

function selectedTier() {
  return TIERS.find((tier) => tier.key === state.tierKey);
}

function selectedConfig() {
  const subject = selectedSubject();
  const value = subject?.options?.[state.formatKey]?.[state.tierKey];
  if (!value) {
    return { appointmentTypeID: null, productID: null };
  }
  const appointmentTypeID = Array.isArray(value) ? value[0] : value;
  const productID = Array.isArray(value) ? value[1] : null;
  return { appointmentTypeID, productID };
}

function money(amount) {
  return `EUR ${amount.toFixed(2)}`;
}

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function savedSelection() {
  try {
    return JSON.parse(sessionStorage.getItem("finbarReturnSelection") || "{}");
  } catch {
    return {};
  }
}

function storedBackUrl() {
  return localStorage.getItem("finbarBackUrl") || "";
}

function savedPendingBooking() {
  try {
    return JSON.parse(sessionStorage.getItem("finbarPendingBooking") || "{}");
  } catch {
    return {};
  }
}

function clearReturnTarget() {
  localStorage.removeItem("finbarReturnTarget");
}

function handleReturnTarget(target) {
  if (!target || target === location.href) {
    clearReturnTarget();
    return;
  }

  clearReturnTarget();
  location.replace(target);
}

function openInNewTab(url) {
  const tab = window.open(url, "_blank");
  if (tab) {
    tab.focus();
  }
}

async function api(path, opts = {}) {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

async function resolvePackageEntitlement({ email, orderID, productID }) {
  const { ok, data } = await api("/api/resolve-package", {
    method: "POST",
    body: JSON.stringify({
      email,
      appointmentTypeID: state.appointmentTypeID,
      orderID,
      productID
    })
  });

  if (!ok || !data.ok || !data.packageValid) {
    throw new Error(data.error || "We could not find an active package for that email.");
  }

  const remaining = data.certificate?.remainingCounts?.[String(state.appointmentTypeID)]
    ?? data.certificate?.remaining
    ?? data.remaining
    ?? selectedTier().sessions
    ?? 1;

  return {
    certificate: data.certificate?.code || data.certificate?.certificate || data.certificate?.packageCode || data.certificate,
    remaining
  };
}

function setStep(n) {
  document.querySelectorAll(".step").forEach((el) => el.classList.add("hidden"));
  $(`step${n}`).classList.remove("hidden");
  document.querySelectorAll(".progress-step").forEach((el) => {
    const step = Number(el.dataset.step);
    el.classList.toggle("active", step === n);
    el.classList.toggle("done", step < n);
  });
}

function syncBackLinks() {
  const backLink = $("backToCarrdLink");
  const bridge = $("bridgeLinks");
  if (!backLink || !bridge) {
    return;
  }

  if (state.backUrl) {
    backLink.href = state.backUrl;
    backLink.classList.remove("hidden");
    bridge.classList.remove("hidden");
  } else {
    backLink.classList.add("hidden");
    bridge.classList.add("hidden");
  }
}

function populateSelectors() {
  $("subjectSelect").innerHTML = CLASS_DATA.map((item, index) =>
    `<option value="${index}">${item.name}</option>`
  ).join("");
  $("formatSelect").innerHTML = FORMATS.map((format) =>
    `<option value="${format.key}">${format.label}</option>`
  ).join("");
  $("tierSelect").innerHTML = TIERS.map((tier) =>
    `<option value="${tier.key}">${tier.label}</option>`
  ).join("");

  const params = new URLSearchParams(location.search);
  const saved = savedSelection();
  const subjectName = params.get("subject") || saved.subject;
  const formatKey = params.get("format") || saved.format;
  const tierKey = params.get("tier") || saved.tier;
  const appointmentTypeID = Number(params.get("appointmentTypeID") || saved.appointmentTypeID);
  const source = params.get("source") || "";
  const email = params.get("email") || saved.packageEmail || "";
  const orderID = params.get("orderID") || "";
  const productID = params.get("productID") || "";
  const datetime = params.get("datetime") || "";
  const appointmentCreated = params.get("appointmentCreated") === "1";
  const certificateCreated = params.get("certificateCreated") === "1";
  const certificate = params.get("certificate") || saved.certificate || "";
  const directToSessions = params.get("step") === "2";
  const backUrl = params.get("backUrl") || saved.backUrl || storedBackUrl() || "";

  state.returnSource = source;
  state.returnOrderID = orderID;
  state.productID = productID || state.productID;
  state.backUrl = backUrl;
  if (backUrl) {
    localStorage.setItem("finbarBackUrl", backUrl);
  }

  const returnTarget = localStorage.getItem("finbarReturnTarget");
  if (returnTarget) {
    handleReturnTarget(returnTarget);
  }

  if (subjectName) {
    const index = CLASS_DATA.findIndex((item) => item.name === subjectName);
    if (index >= 0) state.subjectIndex = index;
  }
  if (FORMATS.some((format) => format.key === formatKey)) state.formatKey = formatKey;
  if (TIERS.some((tier) => tier.key === tierKey)) state.tierKey = tierKey;
  if (appointmentTypeID) {
    CLASS_DATA.forEach((item, subjectIndex) => {
      FORMATS.forEach((format) => {
        TIERS.forEach((tier) => {
          const config = item.options[format.key][tier.key];
          const id = Array.isArray(config) ? config[0] : config;
          if (id === appointmentTypeID) {
            state.subjectIndex = subjectIndex;
            state.formatKey = format.key;
            state.tierKey = tier.key;
          }
        });
      });
    });
  }

  $("subjectSelect").value = String(state.subjectIndex);
  $("formatSelect").value = state.formatKey;
  $("tierSelect").value = state.tierKey;
  updateChoiceUI();

  if (email) {
    state.packageEmail = email;
    $("packageEmailInput").value = email;
  }

  if (certificate) {
    state.certificate = certificate;
  }

  if (saved.packageEmail && !$("packageEmailInput").value) {
    $("packageEmailInput").value = saved.packageEmail;
  }

  syncBackLinks();

  if (appointmentCreated) {
    queueMicrotask(() => showCompletedBooking({ datetime }));
    return;
  }

  if (selectedTier().needsPackage && (directToSessions || source === "acuity" || certificateCreated || productID || certificate)) {
    if (certificate) {
      state.packageMode = "redeem";
      setPackageMode("redeem");
      state.remaining = selectedTier().sessions;
      $("email").value = state.packageEmail || email || "";
      $("bookingTitle").textContent = `${selectedSubject().name} - ${selectedFormat().label}`;
      $("timeEyebrow").textContent = "Redeem package";
      $("balancePill").classList.remove("hidden");
      updateSelectedUI();
      setStep(2);
      loadMonth({ autoAdvance: true });
      return;
    }
    setPackageMode("redeem");
    queueMicrotask(() => resumeReturnedPackage());
  } else {
    setPackageMode(state.packageMode);
  }
}

function updateChoiceUI() {
  state.subjectIndex = Number($("subjectSelect").value);
  state.formatKey = $("formatSelect").value;
  state.tierKey = $("tierSelect").value;
  Object.assign(state, selectedConfig());

  const tier = selectedTier();
  const format = selectedFormat();
  const price = format.price[tier.key];
  $("choiceSummary").innerHTML = `<strong>${selectedSubject().name}</strong><br>${format.label} - ${tier.label} - ${money(price)}`;
  $("packageChoice").classList.toggle("hidden", !tier.needsPackage);
  $("certificateFields").classList.toggle("hidden", !tier.needsPackage || state.packageMode === "buy");
  const mappingReady = Boolean(state.appointmentTypeID);
  $("continueChoiceBtn").textContent = tier.needsPackage && state.packageMode === "buy"
    ? "Pay"
    : "Select dates/times";
  $("continueChoiceBtn").disabled = !mappingReady;
  $("step1Error").textContent = mappingReady ? "" : "This lesson type is not mapped to Acuity yet. Please update it in the dashboard first.";
}

function setPackageMode(mode) {
  state.packageMode = mode;
  $("redeemPackageBtn").classList.toggle("active", mode === "redeem");
  $("buyPackageBtn").classList.toggle("active", mode === "buy");
  updateChoiceUI();
}

async function checkoutBridgeUrl(details = {}) {
  const { ok, data } = await api("/api/package-checkout", {
    method: "POST",
    body: JSON.stringify({
      subject: selectedSubject().name,
      format: state.formatKey,
      tier: state.tierKey,
      appointmentTypeID: String(state.appointmentTypeID),
      productID: state.productID ? String(state.productID) : "",
      email: details.email || state.packageEmail || "",
      backUrl: state.backUrl || "",
      source: "custom-flow",
      datetime: details.datetime || "",
      calendarID: CALENDAR_ID,
      firstName: details.firstName || "",
      lastName: details.lastName || "",
      phone: details.phone || "",
      studentName: details.studentName || "",
      studentName2: details.studentName2 || "",
      studentFieldID: STUDENT_NAME_FIELD_ID,
      notes: details.notes || "",
      timezone: details.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
    })
  });

  if (!ok || !data.ok || !data.url) {
    throw new Error(data.error || "We could not open the checkout page.");
  }

  return data.url;
}

async function resumeReturnedPackage() {
  const params = new URLSearchParams(location.search);
  const email = state.packageEmail || params.get("email") || "";
  const orderID = params.get("orderID") || state.returnOrderID || "";

  if (!email) {
    return;
  }

  $("step1Error").textContent = "";
  $("continueChoiceBtn").disabled = true;
  $("continueChoiceBtn").textContent = "Locating your package...";

  try {
    const resolved = await resolvePackageEntitlement({
      email,
      orderID,
      productID: state.productID
    });
    state.packageMode = "redeem";
    setPackageMode("redeem");
    state.packageEmail = email;
    state.certificate = resolved.certificate;
    state.remaining = resolved.remaining || selectedTier().sessions || 1;
    $("email").value = email;
    $("bookingTitle").textContent = `${selectedSubject().name} - ${selectedFormat().label}`;
    $("timeEyebrow").textContent = "Redeem package";
    $("balancePill").classList.remove("hidden");
    updateSelectedUI();
    setStep(2);
    loadMonth({ autoAdvance: true });
  } catch (error) {
    if (state.packageMode === "redeem" || directToSessions) {
      $("step2Error").textContent = error.message;
    } else {
      $("step1Error").textContent = error.message;
    }
  } finally {
    $("continueChoiceBtn").disabled = false;
    updateChoiceUI();
  }
}

async function continueFromChoice() {
  $("step1Error").textContent = "";
  const tier = selectedTier();

  if (tier.needsPackage && state.packageMode === "buy") {
    sessionStorage.setItem("finbarReturnSelection", JSON.stringify({
      subject: selectedSubject().name,
      format: state.formatKey,
      tier: state.tierKey,
      appointmentTypeID: state.appointmentTypeID,
      packageEmail: $("packageEmailInput").value.trim(),
      backUrl: state.backUrl
    }));
    $("continueChoiceBtn").disabled = true;
    $("continueChoiceBtn").textContent = "Paying...";
    try {
      const checkoutUrl = await checkoutBridgeUrl({ email: $("packageEmailInput").value.trim() });
      openInNewTab(checkoutUrl);
      return;
    } catch (error) {
      $("step1Error").textContent = error.message;
      $("continueChoiceBtn").disabled = false;
      updateChoiceUI();
      return;
    }
  }

  state.selected = [];
  state.remaining = tier.sessions;

  if (tier.needsPackage) {
    state.packageEmail = $("packageEmailInput").value.trim();
    if (!state.packageEmail) {
      $("step1Error").textContent = "Enter the email used for your package.";
      return;
    }

    $("continueChoiceBtn").disabled = true;
    $("continueChoiceBtn").textContent = "Checking package...";
    try {
      const resolved = await resolvePackageEntitlement({
        email: state.packageEmail,
        orderID: state.returnOrderID,
        productID: state.productID
      });
      state.certificate = resolved.certificate;
      state.remaining = resolved.remaining || selectedTier().sessions || 1;
      $("email").value = state.packageEmail;
    } catch (error) {
      $("step1Error").textContent = error.message;
      $("continueChoiceBtn").disabled = false;
      updateChoiceUI();
      return;
    }
    $("continueChoiceBtn").disabled = false;
    updateChoiceUI();
  }

  $("bookingTitle").textContent = `${selectedSubject().name} - ${selectedFormat().label}`;
  $("timeEyebrow").textContent = tier.needsPackage ? "Redeem package" : "Pick a time";
  $("balancePill").classList.toggle("hidden", !tier.needsPackage);
  updateSelectedUI();
  setStep(2);
  loadMonth({ autoAdvance: true });
}

async function loadMonth({ autoAdvance = false } = {}) {
  const grid = $("dateGrid");
  const originalMonth = new Date(state.currentMonth);
  const maxAttempts = autoAdvance ? 12 : 1;
  let attempt = 0;

  while (attempt < maxAttempts) {
    const monthToLoad = new Date(state.currentMonth);
    $("monthLabel").textContent = monthToLoad.toLocaleString("en-US", { month: "long", year: "numeric" });
    grid.innerHTML = `<p class="muted">Loading available times...</p>`;

    const path = `/api/availability-dates?appointmentTypeID=${state.appointmentTypeID}&month=${monthKey(monthToLoad)}&calendarID=${CALENDAR_ID}`;
    const { ok, data } = await api(path);
    grid.innerHTML = "";

    if (!ok || !data.ok || !Array.isArray(data.dates) || data.dates.length === 0) {
      if (autoAdvance) {
        state.currentMonth.setMonth(state.currentMonth.getMonth() + 1);
        attempt += 1;
        continue;
      }

      grid.innerHTML = `<p class="muted">No available times this month. Try another month.</p>`;
      return;
    }

    const schedule = await Promise.all(data.dates.map(async (item) => {
      const timesPath = `/api/availability-times?appointmentTypeID=${state.appointmentTypeID}&date=${item.date}&calendarID=${CALENDAR_ID}`;
      const timesRes = await api(timesPath);
      return {
        date: item.date,
        times: timesRes.ok && timesRes.data && Array.isArray(timesRes.data.times) ? timesRes.data.times : []
      };
    }));

    const hasAnyTimes = schedule.some((item) => Array.isArray(item.times) && item.times.length > 0);
    if (autoAdvance && !hasAnyTimes) {
      state.currentMonth.setMonth(state.currentMonth.getMonth() + 1);
      attempt += 1;
      continue;
    }

    state.scheduleData = schedule;
    renderSchedule();
    return;
  }

  state.currentMonth = originalMonth;
  grid.innerHTML = `<p class="muted">No available times this month. Try another month.</p>`;
}

function renderSchedule() {
  const grid = $("dateGrid");
  grid.innerHTML = "";

  if (!Array.isArray(state.scheduleData) || state.scheduleData.length === 0) {
    grid.innerHTML = `<p class="muted">No available times this month. Try another month.</p>`;
    return;
  }

  state.scheduleData.forEach((item) => {
    const dateObj = new Date(`${item.date}T00:00:00`);
    const column = document.createElement("article");
    column.className = "schedule-day";
    column.innerHTML = `
      <header class="schedule-day-head">
        <span class="schedule-dow">${dateObj.toLocaleDateString("en-US", { weekday: "short" })}</span>
        <strong class="schedule-date">${dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</strong>
      </header>
      <div class="schedule-times"></div>
    `;

    const timesWrap = column.querySelector(".schedule-times");
    if (!item.times.length) {
      const empty = document.createElement("div");
      empty.className = "schedule-empty";
      empty.textContent = "No times";
      timesWrap.appendChild(empty);
    } else {
      item.times.forEach((timeItem) => {
        const label = new Date(timeItem.time).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
        const already = state.selected.some((slot) => slot.datetime === timeItem.time);
        const atLimit = state.selected.length >= state.remaining;
        const slot = document.createElement("button");
        slot.type = "button";
        slot.className = `time-slot${already ? " picked" : ""}${atLimit && !already ? " disabled" : ""}`;
        slot.textContent = label;
        slot.disabled = atLimit && !already;
        slot.addEventListener("click", () => {
          if (already) {
            state.selected = state.selected.filter((existing) => existing.datetime !== timeItem.time);
          } else if (!atLimit) {
            if (!selectedTier().needsPackage) state.selected = [];
            state.selected.push({
              date: item.date,
              time: label,
              datetime: timeItem.time
            });
          }
          updateSelectedUI();
          renderSchedule();
        });
        timesWrap.appendChild(slot);
      });
    }

    grid.appendChild(column);
  });
}

function updateSelectedUI() {
  $("selectedCount").textContent = state.selected.length;
  $("totalCount").textContent = state.remaining;
  $("balanceFill").style.width = `${Math.min(100, (state.selected.length / state.remaining) * 100)}%`;
  $("toStep3Btn").disabled = state.selected.length === 0;
  const list = $("selectedList");
  list.innerHTML = "";
  state.selected.forEach((slot, index) => {
    const li = document.createElement("li");
    li.innerHTML = `<span>${slot.date} at ${slot.time}</span>`;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "Remove";
    remove.addEventListener("click", () => {
      state.selected.splice(index, 1);
      updateSelectedUI();
    });
    li.appendChild(remove);
    list.appendChild(li);
  });
}

function goToDetails() {
  const isTwoStudentFormat = state.formatKey === "oneToTwo";
  $("studentTwoGroup").classList.toggle("hidden", !isTwoStudentFormat);
  $("detailsLead").textContent = selectedTier().needsPackage
    ? `These details apply to the ${state.selected.length} package session(s) selected.`
    : isTwoStudentFormat
      ? "Please add both student names so the booking details stay complete."
      : "These details will carry into checkout so the handoff stays quick.";
  if (state.packageEmail && !$("email").value) $("email").value = state.packageEmail;
  $("finishBtn").textContent = selectedTier().needsPackage ? "Confirm package sessions" : "Pay";
  setStep(3);
}

function bookingLabel() {
  return `${selectedSubject().name} - ${selectedFormat().label}`;
}

function showCompletedBooking({ datetime }) {
  const pending = savedPendingBooking();
  const slotLabel = datetime
    ? new Date(datetime).toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      })
    : pending.selection?.[0]
      ? `${pending.selection[0].date} at ${pending.selection[0].time}`
      : "your lesson";

  $("finishTitle").textContent = "Booking ready.";
  $("finishMessage").textContent = `Your lesson on ${slotLabel} is confirmed and your email receipt should arrive shortly.`;

  const items = Array.isArray(pending.selection) && pending.selection.length
    ? pending.selection
    : (state.selected.length ? state.selected : []);

  $("confirmedList").innerHTML = items.map((item) => {
    const label = item.date && item.time ? `${item.date} at ${item.time}` : slotLabel;
    return `<li><strong>${label}</strong></li>`;
  }).join("");
  setStep(4);
}

async function finishBooking() {
  const details = {
    firstName: $("firstName").value.trim(),
    lastName: $("lastName").value.trim(),
    email: $("email").value.trim(),
    phone: $("phone").value.trim(),
    studentName: $("studentName").value.trim(),
    studentName2: $("studentName2").value.trim(),
    notes: $("notes").value.trim()
  };

  $("step3Error").textContent = "";
  if (!details.firstName || !details.lastName || !details.email || !details.phone) {
    $("step3Error").textContent = "Please fill in the name, email, and phone fields.";
    return;
  }
  if (state.formatKey === "oneToTwo" && !details.studentName2) {
    $("step3Error").textContent = "Please add the second student name for the 1:2 lesson.";
    return;
  }

  if (!selectedTier().needsPackage) {
    sessionStorage.setItem("finbarPendingBooking", JSON.stringify({
      subject: selectedSubject().name,
      format: state.formatKey,
      tier: state.tierKey,
      appointmentTypeID: state.appointmentTypeID,
      selection: state.selected,
      details,
      datetime: state.selected[0]?.datetime || ""
    }));
    $("finishBtn").disabled = true;
    $("finishBtn").textContent = "Paying...";
    try {
      const checkoutUrl = await checkoutBridgeUrl({
        ...details,
        datetime: state.selected[0]?.datetime || "",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      });
      openInNewTab(checkoutUrl);
      return;
    } catch (error) {
      $("step3Error").textContent = error.message;
      $("finishBtn").disabled = false;
      $("finishBtn").textContent = "Pay";
      return;
    }
    return;
  }

  $("finishBtn").disabled = true;
  $("finishBtn").textContent = "Confirm sessions...";
  const confirmed = [];
  const failed = [];
  const packageNotes = [
    details.notes,
    details.studentName2 ? `Student 2: ${details.studentName2}` : ""
  ].filter(Boolean).join("\n");

  for (const slot of state.selected) {
    const { ok, data } = await api("/api/book-with-package", {
      method: "POST",
      body: JSON.stringify({
        datetime: slot.datetime,
        appointmentTypeID: state.appointmentTypeID,
        calendarID: CALENDAR_ID,
        firstName: details.firstName,
        lastName: details.lastName,
        email: state.packageEmail || details.email,
        phone: details.phone,
        certificate: state.certificate || undefined,
        orderID: state.returnOrderID || undefined,
        productID: state.productID || undefined,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        notes: packageNotes,
        fields: details.studentName ? [{ id: STUDENT_NAME_FIELD_ID, value: details.studentName }] : []
      })
    });

    if (ok && data.ok) confirmed.push({ ...slot, appointment: data.appointment });
    else failed.push({ ...slot, error: data.error || "Booking failed" });
  }

  $("finishBtn").disabled = false;
  $("finishBtn").textContent = "Confirm package sessions";

  $("finishTitle").textContent = failed.length ? "Some sessions need attention." : "Sessions confirmed.";
  $("finishMessage").textContent = failed.length
    ? `${confirmed.length} of ${state.selected.length} sessions were confirmed. Please contact us for the remaining ${failed.length}.`
    : "A receipt has been sent for each confirmed session.";
  $("confirmedList").innerHTML = confirmed.map((item) =>
    `<li><strong>${item.date} at ${item.time}</strong><br><a href="${item.appointment?.confirmationPage || "#"}" target="_blank" rel="noopener">View appointment details</a></li>`
  ).join("");
  setStep(4);
}

["subjectSelect", "formatSelect", "tierSelect"].forEach((id) => {
  $(id).addEventListener("change", updateChoiceUI);
});
$("redeemPackageBtn").addEventListener("click", () => setPackageMode("redeem"));
$("buyPackageBtn").addEventListener("click", () => setPackageMode("buy"));
$("continueChoiceBtn").addEventListener("click", continueFromChoice);
$("backToChoiceBtn").addEventListener("click", () => setStep(1));
$("toStep3Btn").addEventListener("click", goToDetails);
$("backToTimeBtn").addEventListener("click", () => setStep(2));
$("finishBtn").addEventListener("click", finishBooking);
$("prevMonth").addEventListener("click", () => {
  state.currentMonth.setMonth(state.currentMonth.getMonth() - 1);
  loadMonth();
});
$("nextMonth").addEventListener("click", () => {
  state.currentMonth.setMonth(state.currentMonth.getMonth() + 1);
  loadMonth();
});

(async function init() {
  await loadBookingConfig();
  populateSelectors();
  if (new URLSearchParams(location.search).get("step") === "2") {
    setStep(2);
  } else {
    setStep(1);
  }
})();

window.addEventListener("storage", (event) => {
  if (event.key === "finbarReturnTarget" && event.newValue) {
    handleReturnTarget(event.newValue);
  }
});
