const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../public/lesson-subject-grid-v2.js"), "utf8");

function element(attributes = {}) {
  const classes = new Set();
  return {
    textContent: "",
    innerHTML: "",
    scrollLeft: 0,
    listeners: {},
    classList: {
      add: (value) => classes.add(value),
      remove: (value) => classes.delete(value),
      contains: (value) => classes.has(value),
      toggle: (value, enabled) => enabled ? classes.add(value) : classes.delete(value)
    },
    getAttribute: (name) => attributes[name],
    setAttribute: (name, value) => { attributes[name] = value; },
    addEventListener(name, handler) { this.listeners[name] = handler; }
  };
}

async function grid(config) {
  const track = element();
  const heading = element();
  const overlay = element();
  const buttons = ["trial", "single", "six", "twelve"].flatMap((tier) =>
    ["1:1", "1:2"].map((size) => element({ "data-type": tier, "data-size": size }))
  );
  overlay.querySelector = (selector) => selector === "#fbBookModalSubject" ? heading : null;
  overlay.querySelectorAll = () => buttons;
  const slider = element();
  slider.querySelector = () => track;
  const opened = [];
  let fail = false;
  let refresh;
  const context = {
    URL,
    document: {
      readyState: "complete",
      getElementById: (id) => ({ fbSubjectSlider: slider, fbBookModalOverlay: overlay })[id] || null,
      addEventListener() {}
    },
    window: {
      location: { href: "https://finbrady.carrd.co/#tutoring" },
      setInterval(handler) { refresh = handler; return 1; },
      clearInterval() {},
      open(url) { opened.push(url); return { focus() {} }; }
    },
    async fetch() {
      if (fail) throw new Error("Network unavailable");
      return { ok: true, json: async () => config };
    }
  };
  vm.runInNewContext(source, context);
  const flush = () => new Promise((resolve) => setImmediate(resolve));
  await flush();
  return {
    track, buttons, opened,
    open(subject) {
      track.listeners.click({ target: { closest: () => ({ getAttribute: () => subject }) } });
    },
    async failRefresh() {
      fail = true;
      overlay.classList.remove("is-open");
      refresh();
      await flush();
    }
  };
}

test("Carrd uses live prices and stable course links and excludes unconfigured options", async () => {
  const config = {
    ok: true,
    subjects: [
      { id: "essay-writing-college-apps", name: "College Writing", active: true },
      { id: "new-subject", name: "Unconfigured subject", active: true },
      { id: "draft", name: "Hidden subject", active: false }
    ],
    services: [
      { subjectId: "essay-writing-college-apps", format: "oneToOne", tier: "trial", appointmentTypeID: "123", active: true },
      { subjectId: "essay-writing-college-apps", format: "oneToOne", tier: "pack6", appointmentTypeID: "456", productID: "789", active: true },
      { subjectId: "essay-writing-college-apps", format: "oneToTwo", tier: "trial", appointmentTypeID: "321", active: false },
      { subjectId: "new-subject", format: "oneToOne", tier: "trial", appointmentTypeID: "", active: true }
    ],
    pricing: { prices: { oneToOne: { trial: 35, single: 70, pack6: 390, pack12: 720 }, oneToTwo: { trial: 50 } } }
  };
  const ui = await grid(config);
  assert.match(ui.track.innerHTML, /College Writing/);
  assert.match(ui.track.innerHTML, /href="#essay-writing"/);
  assert.doesNotMatch(ui.track.innerHTML, /Unconfigured subject|Hidden subject/);

  ui.open("College Writing");
  assert.equal(ui.buttons[0].textContent, "EUR 35.00");
  assert.equal(ui.buttons[0].disabled, false);
  assert.equal(ui.buttons[1].disabled, true);
  assert.equal(ui.buttons[4].textContent, "EUR 390.00");
  ui.buttons[0].listeners.click();
  const bookingUrl = new URL(ui.opened[0]);
  assert.equal(bookingUrl.searchParams.get("subject"), "College Writing");
  assert.equal(bookingUrl.searchParams.get("tier"), "trial");
  assert.equal(bookingUrl.searchParams.get("backUrl"), "https://finbrady.carrd.co/#tutoring");

  await ui.failRefresh();
  ui.open("College Writing");
  assert.equal(ui.buttons[0].disabled, false);
  assert.equal(ui.buttons[0].textContent, "EUR 35.00");
});
