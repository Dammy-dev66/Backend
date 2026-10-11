const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../public/lesson-subject-grid-v2.js"), "utf8");

function element(attributes = {}) {
  const classes = new Set();
  let html = "";
  const node = {
    textContent: "",
    dataset: {},
    scrollLeft: 0,
    listeners: {},
    style: {},
    classList: {
      add: (value) => classes.add(value),
      remove: (value) => classes.delete(value),
      contains: (value) => classes.has(value),
      toggle: (value, enabled) => enabled ? classes.add(value) : classes.delete(value)
    },
    getAttribute: (name) => attributes[name],
    setAttribute: (name, value) => { attributes[name] = value; },
    addEventListener(name, handler) { this.listeners[name] = handler; },
    after() {},
    focus() {},
    getClientRects() { return [{}]; }
  };
  Object.defineProperty(node, "innerHTML", {
    get: () => html,
    set(value) {
      html = String(value);
      node.textContent = html.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&");
    }
  });
  return node;
}

async function grid(config) {
  const track = element();
  const heading = element();
  const overlay = element();
  const modalGrid = element();
  const modalIntro = element();
  const modalHeader = element();
  const modal = element();
  modalGrid.querySelectorAll = () => [];
  const buttons = ["trial", "single", "six", "twelve"].flatMap((tier) =>
    ["1:1", "1:2"].map((size) => element({ "data-type": tier, "data-size": size }))
  );
  overlay.querySelector = (selector) => ({
    "#fbBookModalSubject": heading,
    ".fb-book-modal-grid": modalGrid,
    ".fb-book-modal-intro": modalIntro,
    ".fb-book-modal-header": modalHeader,
    ".fb-book-modal": modal,
    ".fb-book-modal-close, .fb-price-btn:not(:disabled)": buttons[0]
  })[selector] || null;
  overlay.querySelectorAll = (selector) => selector === ".fb-price-btn" ? buttons : [];
  const slider = element();
  slider.querySelector = () => track;
  const opened = [];
  let fail = false;
  let refresh;
  const styles = new Map();
  const context = {
    URL,
    document: {
      readyState: "complete",
      getElementById: (id) => ({ fbSubjectSlider: slider, fbBookModalOverlay: overlay })[id] || styles.get(id) || null,
      createElement: () => element(),
      head: { appendChild(node) { styles.set(node.id, node); } },
      body: { style: { overflow: "" } },
      activeElement: null,
      addEventListener() {}
    },
    window: {
      location: { href: "https://finbrady.carrd.co/#tutoring", hostname: "finbrady.carrd.co" },
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
      const selected = config.subjects.find((item) => item.name === subject);
      track.listeners.click({ target: { closest: () => ({ getAttribute: (name) => name === "data-subject-id" ? selected?.id : subject }) } });
    },
    async failRefresh() {
      fail = true;
      overlay.classList.remove("is-open");
      refresh();
      await flush();
    },
    async refresh() {
      refresh();
      await flush();
    }
  };
}

test("Carrd shows active subjects with live prices and stable links, disabling unconfigured options", async () => {
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
      { subjectId: "essay-writing-college-apps", format: "oneToTwo", tier: "single", appointmentTypeID: "322", active: true },
      { subjectId: "new-subject", format: "oneToOne", tier: "trial", appointmentTypeID: "", active: true }
    ],
    pricing: { prices: { oneToOne: { trial: 35, single: 70, pack6: 390, pack12: 720 }, oneToTwo: { trial: 50 } } }
  };
  const ui = await grid(config);
  assert.match(ui.track.innerHTML, /College Writing/);
  assert.match(ui.track.innerHTML, /href="https:\/\/finbrady\.carrd\.co\/#essay-writing"/);
  assert.match(ui.track.innerHTML, /data-subject="Unconfigured subject" data-subject-id="new-subject" disabled/);
  assert.match(ui.track.innerHTML, /Booking soon/);
  assert.doesNotMatch(ui.track.innerHTML, /Hidden subject|href="#new-subject"/);

  ui.open("College Writing");
  assert.equal(ui.buttons[0].textContent, "EUR 35.00");
  assert.equal(ui.buttons[0].disabled, false);
  assert.equal(ui.buttons[1].disabled, true);
  assert.equal(ui.buttons[3].disabled, true, "A mapped lesson without a configured price must not open checkout.");
  assert.equal(ui.buttons[3].textContent, "Price unavailable");
  assert.match(ui.buttons[4].textContent, /^EUR 390\.00Save EUR 30\.00/);
  ui.buttons[0].listeners.click();
  const bookingUrl = new URL(ui.opened[0]);
  assert.equal(bookingUrl.searchParams.get("subject"), "College Writing");
  assert.equal(bookingUrl.searchParams.get("tier"), "trial");
  assert.equal(bookingUrl.searchParams.get("backUrl"), "https://finbrady.carrd.co/#tutoring");

  await ui.failRefresh();
  ui.open("College Writing");
  assert.equal(ui.buttons[0].disabled, true);
  assert.equal(ui.buttons[0].textContent, "Price unavailable");
});

test("Carrd popup keeps subject prices separate and refreshes a saved change", async () => {
  const config = {
    ok: true,
    subjects: [
      { id: "elegant-essays", name: "Elegant Essays", active: true },
      { id: "english-literature", name: "Literary Classics", active: true }
    ],
    services: [
      { subjectId: "elegant-essays", format: "oneToOne", tier: "single", appointmentTypeID: "96953069", active: true },
      { subjectId: "english-literature", format: "oneToOne", tier: "single", appointmentTypeID: "96938767", active: true }
    ],
    pricing: {
      prices: { oneToOne: { trial: 35, single: 70, pack6: 390, pack12: 720 }, oneToTwo: { trial: 50, single: 100, pack6: 540, pack12: 960 } },
      subjectPrices: {
        "elegant-essays": { oneToOne: { single: 81 } },
        "english-literature": { oneToOne: { single: 79 } }
      }
    }
  };
  const ui = await grid(config);
  ui.open("Elegant Essays");
  assert.equal(ui.buttons[2].textContent, "EUR 81.00");
  ui.open("Literary Classics");
  assert.equal(ui.buttons[2].textContent, "EUR 79.00");

  config.pricing.subjectPrices["elegant-essays"].oneToOne.single = 92;
  await ui.refresh();
  ui.open("Elegant Essays");
  assert.equal(ui.buttons[2].textContent, "EUR 92.00");
  ui.open("Literary Classics");
  assert.equal(ui.buttons[2].textContent, "EUR 79.00");
});
