const BACKEND_URL = location.origin.includes("localhost")
  ? "https://backend-ymlj.vercel.app"
  : location.origin;
const OWNER_ID = "39765601";
const CALENDAR_ID = 14289294;
const STUDENT_NAME_FIELD_ID = 18796496;

const CLASS_DATA = [
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

const FORMATS = [
  { key: "oneToOne", label: "1:1 private lesson", price: { trial: 25, single: 50, pack6: 264, pack12: 456 } },
  { key: "oneToTwo", label: "1:2 shared lesson", price: { trial: 35, single: 70, pack6: 360, pack12: 648 } }
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
  remaining: 1,
  selected: [],
  currentMonth: new Date(),
  activeDate: null
};

function subject(name, options) {
  return { name, options };
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
  const value = selectedSubject().options[state.formatKey][state.tierKey];
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

async function api(path, opts = {}) {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
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
  const subjectName = params.get("subject");
  const formatKey = params.get("format");
  const tierKey = params.get("tier");
  const appointmentTypeID = Number(params.get("appointmentTypeID"));

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
  $("certificateFields").classList.toggle("hidden", !tier.needsPackage || state.packageMode !== "redeem");
  $("continueChoiceBtn").textContent = tier.needsPackage && state.packageMode === "buy"
    ? "Buy package securely"
    : "Continue";
}

function setPackageMode(mode) {
  state.packageMode = mode;
  $("redeemPackageBtn").classList.toggle("active", mode === "redeem");
  $("buyPackageBtn").classList.toggle("active", mode === "buy");
  updateChoiceUI();
}

function packagePurchaseUrl() {
  const returnUrl = new URL("/return.html", location.origin);
  returnUrl.searchParams.set("subject", selectedSubject().name);
  returnUrl.searchParams.set("format", state.formatKey);
  returnUrl.searchParams.set("tier", state.tierKey);
  returnUrl.searchParams.set("appointmentTypeID", String(state.appointmentTypeID));

  const url = new URL("https://app.acuityscheduling.com/catalog.php");
  url.searchParams.set("owner", OWNER_ID);
  url.searchParams.set("action", "addCart");
  url.searchParams.set("clear", "1");
  url.searchParams.set("id", String(state.productID));
  url.searchParams.set("returnUrl", returnUrl.toString());
  return url.toString();
}

async function continueFromChoice() {
  $("step1Error").textContent = "";
  const tier = selectedTier();

  if (tier.needsPackage && state.packageMode === "buy") {
    sessionStorage.setItem("finbarReturnSelection", JSON.stringify({
      subject: selectedSubject().name,
      format: state.formatKey,
      tier: state.tierKey,
      appointmentTypeID: state.appointmentTypeID
    }));
    location.href = packagePurchaseUrl();
    return;
  }

  state.selected = [];
  state.remaining = tier.sessions;

  if (tier.needsPackage) {
    state.certificate = $("certificateInput").value.trim();
    state.packageEmail = $("packageEmailInput").value.trim();
    if (!state.certificate || !state.packageEmail) {
      $("step1Error").textContent = "Enter your package code and purchase email.";
      return;
    }

    $("continueChoiceBtn").disabled = true;
    $("continueChoiceBtn").textContent = "Checking package...";
    const { ok, data } = await api("/api/validate-package", {
      method: "POST",
      body: JSON.stringify({
        certificate: state.certificate,
        email: state.packageEmail,
        appointmentTypeID: state.appointmentTypeID
      })
    });
    $("continueChoiceBtn").disabled = false;
    updateChoiceUI();

    if (!ok || !data.ok || !data.packageValid) {
      $("step1Error").textContent = data.error || "That package code could not be verified.";
      return;
    }

    const remaining = data.certificate?.remainingCounts?.[String(state.appointmentTypeID)];
    if (!remaining || remaining <= 0) {
      $("step1Error").textContent = "This package has no sessions remaining.";
      return;
    }

    state.remaining = remaining;
  }

  $("bookingTitle").textContent = `${selectedSubject().name} - ${selectedFormat().label}`;
  $("timeEyebrow").textContent = tier.needsPackage ? "Redeem Sessions" : "Pick A Time";
  $("balancePill").classList.toggle("hidden", !tier.needsPackage);
  updateSelectedUI();
  setStep(2);
  loadMonth();
}

async function loadMonth() {
  $("monthLabel").textContent = state.currentMonth.toLocaleString("en-US", { month: "long", year: "numeric" });
  $("dateGrid").innerHTML = `<p class="muted">Loading available dates...</p>`;
  $("timePanel").classList.add("hidden");

  const path = `/api/availability-dates?appointmentTypeID=${state.appointmentTypeID}&month=${monthKey(state.currentMonth)}&calendarID=${CALENDAR_ID}`;
  const { ok, data } = await api(path);
  const grid = $("dateGrid");
  grid.innerHTML = "";

  if (!ok || !data.ok || !Array.isArray(data.dates) || data.dates.length === 0) {
    grid.innerHTML = `<p class="muted">No available dates this month. Try another month.</p>`;
    return;
  }

  data.dates.forEach((item) => {
    const dateObj = new Date(`${item.date}T00:00:00`);
    const cell = document.createElement("button");
    cell.className = "date-cell";
    cell.type = "button";
    cell.innerHTML = `<span class="dow">${dateObj.toLocaleDateString("en-US", { weekday: "short" })}</span><span class="num">${dateObj.getDate()}</span>`;
    cell.addEventListener("click", () => selectDate(item.date, cell));
    grid.appendChild(cell);
  });
}

async function selectDate(date, cellEl) {
  document.querySelectorAll(".date-cell").forEach((cell) => cell.classList.remove("selected-day"));
  cellEl.classList.add("selected-day");
  state.activeDate = date;

  $("timePanel").classList.remove("hidden");
  $("timePanelLabel").textContent = `Times for ${date}`;
  $("timeGrid").innerHTML = `<p class="muted">Loading times...</p>`;

  const path = `/api/availability-times?appointmentTypeID=${state.appointmentTypeID}&date=${date}&calendarID=${CALENDAR_ID}`;
  const { ok, data } = await api(path);
  const grid = $("timeGrid");
  grid.innerHTML = "";

  if (!ok || !data.ok || !Array.isArray(data.times) || data.times.length === 0) {
    grid.innerHTML = `<p class="muted">No available times this day.</p>`;
    return;
  }

  data.times.forEach((item) => {
    const label = new Date(item.time).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    const already = state.selected.some((slot) => slot.datetime === item.time);
    const atLimit = state.selected.length >= state.remaining;
    const slot = document.createElement("button");
    slot.type = "button";
    slot.className = `time-slot${already ? " picked" : ""}${atLimit && !already ? " disabled" : ""}`;
    slot.textContent = label;
    slot.addEventListener("click", () => {
      if (already) {
        state.selected = state.selected.filter((existing) => existing.datetime !== item.time);
      } else if (!atLimit) {
        if (!selectedTier().needsPackage) state.selected = [];
        state.selected.push({ date, time: label, datetime: item.time });
      }
      updateSelectedUI();
      selectDate(date, cellEl);
    });
    grid.appendChild(slot);
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
  $("detailsLead").textContent = selectedTier().needsPackage
    ? `These details apply to the ${state.selected.length} package session(s) selected.`
    : "These details will be passed to Acuity so checkout stays quick.";
  if (state.packageEmail && !$("email").value) $("email").value = state.packageEmail;
  $("finishBtn").textContent = selectedTier().needsPackage ? "Confirm package sessions" : "Continue to secure checkout";
  setStep(3);
}

function acuityBookingUrl(details) {
  const slot = state.selected[0];
  const url = new URL("https://app.acuityscheduling.com/schedule.php");
  url.searchParams.set("owner", OWNER_ID);
  url.searchParams.set("appointmentType", String(state.appointmentTypeID));
  url.searchParams.set("calendarID", String(CALENDAR_ID));
  url.searchParams.set("datetime", slot.datetime);
  url.searchParams.set("firstName", details.firstName);
  url.searchParams.set("lastName", details.lastName);
  url.searchParams.set("email", details.email);
  url.searchParams.set("phone", details.phone);
  url.searchParams.set(`field:${STUDENT_NAME_FIELD_ID}`, details.studentName);
  if (details.notes) url.searchParams.set("notes", details.notes);
  return url.toString();
}

async function finishBooking() {
  const details = {
    firstName: $("firstName").value.trim(),
    lastName: $("lastName").value.trim(),
    email: $("email").value.trim(),
    phone: $("phone").value.trim(),
    studentName: $("studentName").value.trim(),
    notes: $("notes").value.trim()
  };

  $("step3Error").textContent = "";
  if (!details.firstName || !details.lastName || !details.email || !details.phone) {
    $("step3Error").textContent = "Please fill in name, email, and phone.";
    return;
  }

  if (!selectedTier().needsPackage) {
    location.href = acuityBookingUrl(details);
    return;
  }

  $("finishBtn").disabled = true;
  $("finishBtn").textContent = "Booking sessions...";
  const confirmed = [];
  const failed = [];

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
        certificate: state.certificate,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        notes: details.notes,
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
    : "A confirmation for each session has been sent by email.";
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

populateSelectors();
setStep(1);
