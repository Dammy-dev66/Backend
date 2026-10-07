(function () {
  var API_BASE = "https://backend-ymlj.vercel.app";
  var REFRESH_INTERVAL_MS = 120000;

  var subjectTemplates = {
    "ap-english-language-composition": {
      badge: "AP course",
      tone: "fb-subject-card--blue",
      image: "https://finbar-site-preview.vercel.app/assets/course-collaboration.png"
    },
    "ap-psychology": {
      badge: "AP course",
      tone: "fb-subject-card--lime",
      image: "https://finbar-site-preview.vercel.app/assets/course-collaboration.png"
    },
    "english-literature": {
      badge: "Literature",
      tone: "fb-subject-card--pink",
      image: "https://finbar-site-preview.vercel.app/assets/tutor-call.png"
    },
    "literary-classics": {
      badge: "Literature",
      tone: "fb-subject-card--pink",
      image: "https://finbar-site-preview.vercel.app/assets/tutor-call.png"
    },
    "essay-writing-college-apps": {
      badge: "Writing",
      tone: "fb-subject-card--mist",
      image: "https://finbar-site-preview.vercel.app/assets/tutor-call.png"
    },
    "elegant-essays": {
      badge: "Writing",
      tone: "fb-subject-card--mist",
      image: "https://finbar-site-preview.vercel.app/assets/course-collaboration.png"
    }
  };

  var fallbackSubjects = [
    { id: "ap-english-language-composition", name: "AP English Language & Composition", slug: "ap-english-language-composition" },
    { id: "ap-psychology", name: "AP Psychology", slug: "ap-psychology" },
    { id: "english-literature", name: "Literary Classics", slug: "english-literature" },
    { id: "essay-writing-college-apps", name: "Essay Writing & College Apps", slug: "essay-writing-college-apps" },
    { id: "elegant-essays", name: "Elegant Essays", slug: "elegant-essays" }
  ];

  var bookingLinks = {};
  var overlay = document.getElementById("fbBookModalOverlay");
  var slider = document.getElementById("fbSubjectSlider");
  var track = slider ? slider.querySelector(".fb-slider-track") : null;
  var subjectHeading = overlay ? overlay.querySelector("#fbBookModalSubject") : null;
  var closeBtn = overlay ? overlay.querySelector(".fb-book-modal-close") : null;
  var cancelBtn = overlay ? overlay.querySelector(".fb-book-modal-cancel") : null;
  var currentSubject = null;
  var currentSubjectId = "";
  var modalTrigger = null;
  var previousBodyOverflow = "";
  var currentPricing = null;
  var currentPopup = {};
  var refreshTimer = null;
  var isRendering = false;

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function openInNewTab(url) {
    var safeUrl = safeWebLink(url);
    if (safeUrl) window.open(safeUrl, "_blank", "noopener,noreferrer");
  }

  function safeWebLink(value) {
    if (!String(value || "").trim()) return "";
    try {
      var url = new URL(String(value || ""), window.location.href);
      if (url.protocol === "https:" || (url.protocol === "http:" && ["localhost", "127.0.0.1"].indexOf(window.location.hostname) >= 0)) return url.toString();
    } catch (error) {
      return "";
    }
    return "";
  }

  function tierKey(tier) {
    if (tier === "pack6") return "six";
    if (tier === "pack12") return "twelve";
    return tier;
  }

  function sizeKey(format) {
    return format === "oneToTwo" ? "1:2" : "1:1";
  }

  function subjectMeta(subject, index) {
    var template = subjectTemplates[subject.slug] || subjectTemplates[subject.id];
    var toneCycle = ["fb-subject-card--blue", "fb-subject-card--lime", "fb-subject-card--pink", "fb-subject-card--mist"];
    return {
      badge: template ? template.badge : "Tutoring",
      tone: template ? template.tone : toneCycle[index % toneCycle.length],
      image: template ? template.image : "https://finbar-site-preview.vercel.app/assets/course-collaboration.png"
    };
  }

  function subjectSlug(subject) {
    return String(subject.slug || subject.id || subject.name || "subject")
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "subject";
  }

  function courseInfoAnchor(subject) {
    var stableAnchors = {
      "ap-english-language-composition": "#ap-english-language",
      "ap-psychology": "#ap-psychology",
      "english-literature": "#english-literature",
      "essay-writing-college-apps": "#essay-writing",
      "elegant-essays": "#elegant-essays"
    };
    if (stableAnchors[subject.id]) {
      return stableAnchors[subject.id];
    }

    var name = String(subject.name || "").trim().toLowerCase();
    var anchors = {
      "ap english language": "#ap-english-language",
      "ap english language & composition": "#ap-english-language",
      "ap psychology": "#ap-psychology",
      "english literature": "#english-literature",
      "literary classics": "#english-literature",
      "essay writing": "#essay-writing",
      "essay writing & college apps": "#essay-writing",
      "elegant essays": "#elegant-essays"
    };

    var candidate = "#" + subjectSlug(subject);
    return anchors[name] || (document.getElementById(candidate.slice(1)) ? candidate : "");
  }

  function buildSubjectCard(subject, index) {
    var meta = subjectMeta(subject, index);
    var courseInfoUrl = safeWebLink(subject.courseInfoUrl || subject.infoUrl || courseInfoAnchor(subject));
    var canBook = Boolean(currentPricing) && Object.keys(bookingLinks[subject.name] || {}).some(function (key) {
      return Boolean(safeWebLink(bookingLinks[subject.name][key]));
    });

    return [
      '<article class="fb-subject-card ' + meta.tone + '">',
      '<div class="fb-subject-card__content">',
      '<p class="fb-subject-card__eyebrow">' + escapeHtml(meta.badge) + '</p>',
      '<h3>' + escapeHtml(subject.name) + '</h3>',
      '<div class="fb-subject-card__actions">',
      courseInfoUrl ? '<a class="fb-subject-info-link" href="' + escapeHtml(courseInfoUrl) + '">Course info <span aria-hidden="true">↗</span></a>' : "",
      '<button type="button" class="fb-book-link" data-subject="' + escapeHtml(subject.name) + '" data-subject-id="' + escapeHtml(subject.id) + '"' +
        (canBook ? "" : ' disabled aria-disabled="true" title="' + (currentPricing ? "Lessons for this course are coming soon." : "Live booking prices are temporarily unavailable.") + '" style="opacity:0.65;cursor:not-allowed"') +
        '>' + (canBook ? "Book now" : currentPricing ? "Booking soon" : "Temporarily unavailable") + '</button>',
      '</div>',
      '</div>',
      '<img class="fb-subject-card__image" src="' + escapeHtml(meta.image) + '" alt="" loading="lazy">',
      '</article>'
    ].join("");
  }

  function renderSubjects(subjects) {
    if (!track || !Array.isArray(subjects) || isRendering) {
      return;
    }

    isRendering = true;
    var scrollLeft = track.scrollLeft;
    for (var count = 5; count <= 10; count += 1) {
      slider.classList.toggle("fb-subject-slider--count-" + count, subjects.length === count);
    }
    track.innerHTML = subjects.map(buildSubjectCard).join("");
    track.scrollLeft = scrollLeft;
    isRendering = false;
  }

  function pricingTier(type) {
    if (type === "six") return "pack6";
    if (type === "twelve") return "pack12";
    return type;
  }

  function pricingFormat(size) {
    return size === "1:2" ? "oneToTwo" : "oneToOne";
  }

  function formatPrice(amount) {
    var number = Number(amount);
    return Number.isFinite(number) ? "EUR " + number.toFixed(2) : "Unavailable";
  }

  function subjectPrice(subjectId, format, tier) {
    var value = currentPricing && currentPricing.subjectPrices && currentPricing.subjectPrices[subjectId]
      ? currentPricing.subjectPrices[subjectId][format] && currentPricing.subjectPrices[subjectId][format][tier]
      : null;
    if (value === null || value === undefined || !Number.isFinite(Number(value))) value = currentPricing && currentPricing.prices && currentPricing.prices[format] && currentPricing.prices[format][tier];
    return value !== null && value !== undefined && Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : null;
  }

  function ensurePopupContent() {
    if (!overlay) return;
    var grid = overlay.querySelector(".fb-book-modal-grid");
    if (!grid) return;
    var intro = overlay.querySelector(".fb-book-modal-intro");
    if (!intro) {
      intro = document.createElement("p");
      intro.className = "fb-book-modal-intro";
      overlay.querySelector(".fb-book-modal-header").after(intro);
    }
    intro.textContent = currentPopup.heading || "Choose a lesson format";

    var heads = grid.querySelectorAll(".fb-dropdown-head");
    if (heads[0]) heads[0].textContent = "One student (1:1)";
    if (heads[1]) heads[1].textContent = "Two students (1:2)";

    var policy = overlay.querySelector(".fb-book-modal-policy");
    if (currentPopup.policyText) {
      if (!policy) {
        policy = document.createElement("p");
        policy.className = "fb-book-modal-policy";
        grid.after(policy);
      }
      policy.textContent = currentPopup.policyText;
    } else if (policy) {
      policy.remove();
    }
  }

  function applyPopupStyles() {
    if (document.getElementById("fb-book-modal-live-styles")) return;
    var style = document.createElement("style");
    style.id = "fb-book-modal-live-styles";
    style.textContent = [
      ".fb-book-modal{width:min(760px,calc(100vw - 32px))!important;max-height:min(88vh,820px)!important;overflow:auto!important;padding:clamp(24px,4vw,40px)!important;box-sizing:border-box!important}",
      ".fb-book-modal{overscroll-behavior:contain!important}",
      ".fb-book-modal-header h4{font-size:clamp(26px,4vw,36px)!important;line-height:1.1!important}",
      ".fb-book-modal-intro{margin:10px 0 22px!important;color:#53627a!important;font-size:15px!important;line-height:1.55!important}",
      ".fb-book-modal-grid{gap:12px 14px!important}",
      ".fb-dropdown-head{font-size:12px!important;line-height:1.35!important;white-space:normal!important}",
      ".fb-dropdown-label{font-size:13px!important}",
      ".fb-price-btn{min-height:62px!important;padding:9px 10px!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:3px!important;font-size:14px!important}",
      ".fb-price-btn__amount{font-weight:700!important}",
      ".fb-price-btn__saving{font-size:10px!important;line-height:1.2!important;font-weight:600!important;color:#0a3d91!important}",
      ".fb-dropdown-label small{display:block;margin-top:3px;color:#0a3d91;font-size:10px;line-height:1.3;font-weight:600}",
      ".fb-book-modal-policy{margin:18px 0 0;padding-top:14px;border-top:1px solid #d9cdbb;color:#36465e;font-size:13px;line-height:1.6;white-space:pre-line}",
      "@media(max-width:560px){.fb-book-modal{width:calc(100vw - 20px)!important;padding:22px 16px!important}.fb-book-modal-grid{gap:9px 7px!important}.fb-price-btn{min-height:56px!important;padding:7px 4px!important;font-size:12px!important}.fb-dropdown-head{font-size:10px!important}}"
    ].join("");
    document.head.appendChild(style);
  }

  function updateModalOptions() {
    if (!overlay) {
      return;
    }

    var subjectLinks = currentSubject ? bookingLinks[currentSubject] || {} : {};
    overlay.querySelectorAll(".fb-price-btn").forEach(function (btn) {
      var type = btn.getAttribute("data-type");
      var size = btn.getAttribute("data-size");
      var amount = subjectPrice(currentSubjectId, pricingFormat(size), pricingTier(type));
      var hasBooking = Boolean(currentPricing && amount !== null && safeWebLink(subjectLinks[type + ":" + size]));

      if (amount !== null && amount !== undefined) {
        var saving = "";
        var sessions = type === "six" ? 6 : type === "twelve" ? 12 : 0;
        if (sessions) {
          var singlePrice = subjectPrice(currentSubjectId, pricingFormat(size), "single");
          var amountSaved = singlePrice === null ? 0 : Math.max(0, singlePrice * sessions - amount);
          var percentSaved = singlePrice === null || singlePrice <= 0 ? 0 : Math.round((amountSaved / (singlePrice * sessions)) * 100);
          if (amountSaved > 0) saving = "Save " + formatPrice(amountSaved).replace("EUR ", "EUR ") + (percentSaved ? " · " + percentSaved + "%" : "");
        }
        btn.innerHTML = '<span class="fb-price-btn__amount">' + escapeHtml(formatPrice(amount)) + '</span>' + (saving ? '<span class="fb-price-btn__saving">' + escapeHtml(saving) + '</span>' : '');
      } else {
        btn.innerHTML = '<span class="fb-price-btn__amount">Price unavailable</span>';
      }

      btn.disabled = !hasBooking;
      btn.classList.toggle("is-unavailable", !hasBooking);
      btn.setAttribute("aria-disabled", hasBooking ? "false" : "true");
      btn.title = hasBooking ? "" : !currentPricing ? "Live booking prices are temporarily unavailable." : amount === null ? "The price for this lesson is not configured yet." : "This lesson option is not available for this subject yet.";
    });
    ensurePopupContent();
    var labels = overlay.querySelectorAll(".fb-dropdown-label");
    labels.forEach(function (label) {
      if (!label.dataset.baseLabel) label.dataset.baseLabel = label.textContent.trim();
      var type = label.dataset.baseLabel.indexOf("6-") === 0 ? "pack6" : label.dataset.baseLabel.indexOf("12-") === 0 ? "pack12" : "";
      var note = type && currentPopup.packageNotes ? currentPopup.packageNotes[type] : "";
      label.innerHTML = escapeHtml(label.dataset.baseLabel) + (note ? '<small>' + escapeHtml(note) + '</small>' : "");
    });
  }

  async function loadBookingConfig() {
    try {
      var response = await fetch(API_BASE + "/api/booking-config", {
        cache: "no-store"
      });
      var data = await response.json().catch(function () { return {}; });
      if (!response.ok || !data || !data.ok || !Array.isArray(data.subjects) || !Array.isArray(data.services)) {
        return false;
      }

      var nextLinks = {};
      var activeSubjects = data.subjects
        .filter(function (subject) { return subject.active !== false; })
        .sort(function (a, b) {
          return (Number(a.order) || 0) - (Number(b.order) || 0) || String(a.name || "").localeCompare(String(b.name || ""));
        });

      activeSubjects.forEach(function (subject) {
        nextLinks[subject.name] = {};
      });

      data.services
        .filter(function (service) {
          return service.active !== false && Boolean(service.appointmentTypeID);
        })
        .forEach(function (service) {
          var subject = activeSubjects.find(function (item) { return item.id === service.subjectId; });
          if (!subject || !nextLinks[subject.name]) {
            return;
          }

          var url = new URL(API_BASE + "/");
          url.searchParams.set("subject", subject.name);
          url.searchParams.set("subjectId", subject.id);
          url.searchParams.set("format", service.format);
          url.searchParams.set("tier", service.tier);
          url.searchParams.set("source", "carrd");

          nextLinks[subject.name][tierKey(service.tier) + ":" + sizeKey(service.format)] = url.toString();
        });

      bookingLinks = nextLinks;
      currentPricing = data.pricing && data.pricing.prices ? data.pricing : null;
      currentPopup = data.pricing && data.pricing.popup ? data.pricing.popup : {};
      renderSubjects(activeSubjects);
      updateModalOptions();
      return true;
    } catch {
      bookingLinks = {};
      currentPricing = null;
      currentPopup = {};
      renderSubjects(fallbackSubjects);
      updateModalOptions();
      return false;
    }
  }

  function openModal(subject, subjectId) {
    currentSubject = subject;
    currentSubjectId = subjectId || "";
    modalTrigger = document.activeElement;
    if (subjectHeading) {
      subjectHeading.textContent = subject;
    }
    updateModalOptions();
    var dialog = overlay.querySelector(".fb-book-modal");
    if (dialog) {
      dialog.setAttribute("role", "dialog");
      dialog.setAttribute("aria-modal", "true");
      dialog.setAttribute("aria-label", subject + " lesson options");
    }
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden", "false");
    var firstControl = overlay.querySelector(".fb-book-modal-close, .fb-price-btn:not(:disabled)");
    if (firstControl) firstControl.focus();
  }

  function closeModal() {
    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");
    document.body.style.overflow = previousBodyOverflow;
    currentSubject = null;
    currentSubjectId = "";
    if (modalTrigger && typeof modalTrigger.focus === "function") modalTrigger.focus();
    modalTrigger = null;
  }

  function initModal() {
    if (!overlay || !track) {
      return;
    }

    track.addEventListener("click", function (event) {
      var btn = event.target.closest(".fb-book-link");
      if (!btn || btn.disabled) {
        return;
      }
      openModal(btn.getAttribute("data-subject"), btn.getAttribute("data-subject-id"));
    });

    if (closeBtn) {
      closeBtn.addEventListener("click", closeModal);
    }
    if (cancelBtn) {
      cancelBtn.addEventListener("click", closeModal);
    }

    overlay.addEventListener("click", function (event) {
      if (event.target === overlay) {
        closeModal();
      }
    });

    document.addEventListener("keydown", function (event) {
      if (!overlay.classList.contains("is-open")) return;
      if (event.key === "Escape") {
        closeModal();
        return;
      }
      if (event.key !== "Tab") return;
      var focusable = Array.from(overlay.querySelectorAll("button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex='-1'])"))
        .filter(function (element) { return element.getClientRects().length > 0; });
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !overlay.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !overlay.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    });

    overlay.querySelectorAll(".fb-price-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (!currentSubject || btn.disabled) {
          return;
        }
        var type = btn.getAttribute("data-type");
        var size = btn.getAttribute("data-size");
        var entry = bookingLinks[currentSubject];
        var url = entry ? entry[type + ":" + size] : null;
        if (url) {
          var target = new URL(url);
          target.searchParams.set("backUrl", window.location.href);
          openInNewTab(target.toString());
        }
        closeModal();
      });
    });
  }

  function startAutoRefresh() {
    if (refreshTimer) {
      window.clearInterval(refreshTimer);
    }

    refreshTimer = window.setInterval(function () {
      if (overlay && overlay.classList.contains("is-open")) {
        return;
      }
      loadBookingConfig();
    }, REFRESH_INTERVAL_MS);
  }

  function boot() {
    applyPopupStyles();
    initModal();

    renderSubjects(fallbackSubjects);
    updateModalOptions();

    loadBookingConfig().finally(function () {
      startAutoRefresh();
    });

    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible") {
        loadBookingConfig();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
