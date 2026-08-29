(function () {
  var API_BASE = "https://backend-ymlj.vercel.app";
  var REFRESH_INTERVAL_MS = 120000;

  var fallbackBookingLinks = {
    "AP Psychology": {
      "trial:1:1": "https://backend-ymlj.vercel.app/?subject=AP%20Psychology&format=oneToOne&tier=trial&source=carrd",
      "trial:1:2": "https://backend-ymlj.vercel.app/?subject=AP%20Psychology&format=oneToTwo&tier=trial&source=carrd",
      "single:1:1": "https://backend-ymlj.vercel.app/?subject=AP%20Psychology&format=oneToOne&tier=single&source=carrd",
      "single:1:2": "https://backend-ymlj.vercel.app/?subject=AP%20Psychology&format=oneToTwo&tier=single&source=carrd",
      "six:1:1": "https://backend-ymlj.vercel.app/?subject=AP%20Psychology&format=oneToOne&tier=pack6&source=carrd",
      "six:1:2": "https://backend-ymlj.vercel.app/?subject=AP%20Psychology&format=oneToTwo&tier=pack6&source=carrd",
      "twelve:1:1": "https://backend-ymlj.vercel.app/?subject=AP%20Psychology&format=oneToOne&tier=pack12&source=carrd",
      "twelve:1:2": "https://backend-ymlj.vercel.app/?subject=AP%20Psychology&format=oneToTwo&tier=pack12&source=carrd"
    },
    "Elegant Essays": {
      "trial:1:1": "https://backend-ymlj.vercel.app/?subject=Elegant%20Essays&format=oneToOne&tier=trial&source=carrd",
      "trial:1:2": "https://backend-ymlj.vercel.app/?subject=Elegant%20Essays&format=oneToTwo&tier=trial&source=carrd",
      "single:1:1": "https://backend-ymlj.vercel.app/?subject=Elegant%20Essays&format=oneToOne&tier=single&source=carrd",
      "single:1:2": "https://backend-ymlj.vercel.app/?subject=Elegant%20Essays&format=oneToTwo&tier=single&source=carrd",
      "six:1:1": "https://backend-ymlj.vercel.app/?subject=Elegant%20Essays&format=oneToOne&tier=pack6&source=carrd",
      "six:1:2": "https://backend-ymlj.vercel.app/?subject=Elegant%20Essays&format=oneToTwo&tier=pack6&source=carrd",
      "twelve:1:1": "https://backend-ymlj.vercel.app/?subject=Elegant%20Essays&format=oneToOne&tier=pack12&source=carrd",
      "twelve:1:2": "https://backend-ymlj.vercel.app/?subject=Elegant%20Essays&format=oneToTwo&tier=pack12&source=carrd"
    },
    "AP English Language & Composition": {
      "trial:1:1": "https://backend-ymlj.vercel.app/?subject=AP%20English%20Language%20%26%20Composition&format=oneToOne&tier=trial&source=carrd",
      "trial:1:2": "https://backend-ymlj.vercel.app/?subject=AP%20English%20Language%20%26%20Composition&format=oneToTwo&tier=trial&source=carrd",
      "single:1:1": "https://backend-ymlj.vercel.app/?subject=AP%20English%20Language%20%26%20Composition&format=oneToOne&tier=single&source=carrd",
      "single:1:2": "https://backend-ymlj.vercel.app/?subject=AP%20English%20Language%20%26%20Composition&format=oneToTwo&tier=single&source=carrd",
      "six:1:1": "https://backend-ymlj.vercel.app/?subject=AP%20English%20Language%20%26%20Composition&format=oneToOne&tier=pack6&source=carrd",
      "six:1:2": "https://backend-ymlj.vercel.app/?subject=AP%20English%20Language%20%26%20Composition&format=oneToTwo&tier=pack6&source=carrd",
      "twelve:1:1": "https://backend-ymlj.vercel.app/?subject=AP%20English%20Language%20%26%20Composition&format=oneToOne&tier=pack12&source=carrd",
      "twelve:1:2": "https://backend-ymlj.vercel.app/?subject=AP%20English%20Language%20%26%20Composition&format=oneToTwo&tier=pack12&source=carrd"
    },
    "English Literature": {
      "trial:1:1": "https://backend-ymlj.vercel.app/?subject=English%20Literature&format=oneToOne&tier=trial&source=carrd",
      "trial:1:2": "https://backend-ymlj.vercel.app/?subject=English%20Literature&format=oneToTwo&tier=trial&source=carrd",
      "single:1:1": "https://backend-ymlj.vercel.app/?subject=English%20Literature&format=oneToOne&tier=single&source=carrd",
      "single:1:2": "https://backend-ymlj.vercel.app/?subject=English%20Literature&format=oneToTwo&tier=single&source=carrd",
      "six:1:1": "https://backend-ymlj.vercel.app/?subject=English%20Literature&format=oneToOne&tier=pack6&source=carrd",
      "six:1:2": "https://backend-ymlj.vercel.app/?subject=English%20Literature&format=oneToTwo&tier=pack6&source=carrd",
      "twelve:1:1": "https://backend-ymlj.vercel.app/?subject=English%20Literature&format=oneToOne&tier=pack12&source=carrd",
      "twelve:1:2": "https://backend-ymlj.vercel.app/?subject=English%20Literature&format=oneToTwo&tier=pack12&source=carrd"
    },
    "Essay Writing & College Apps": {
      "trial:1:1": "https://backend-ymlj.vercel.app/?subject=Essay%20Writing%20%26%20College%20Apps&format=oneToOne&tier=trial&source=carrd",
      "trial:1:2": "https://backend-ymlj.vercel.app/?subject=Essay%20Writing%20%26%20College%20Apps&format=oneToTwo&tier=trial&source=carrd",
      "single:1:1": "https://backend-ymlj.vercel.app/?subject=Essay%20Writing%20%26%20College%20Apps&format=oneToOne&tier=single&source=carrd",
      "single:1:2": "https://backend-ymlj.vercel.app/?subject=Essay%20Writing%20%26%20College%20Apps&format=oneToTwo&tier=single&source=carrd",
      "six:1:1": "https://backend-ymlj.vercel.app/?subject=Essay%20Writing%20%26%20College%20Apps&format=oneToOne&tier=pack6&source=carrd",
      "six:1:2": "https://backend-ymlj.vercel.app/?subject=Essay%20Writing%20%26%20College%20Apps&format=oneToTwo&tier=pack6&source=carrd",
      "twelve:1:1": "https://backend-ymlj.vercel.app/?subject=Essay%20Writing%20%26%20College%20Apps&format=oneToOne&tier=pack12&source=carrd",
      "twelve:1:2": "https://backend-ymlj.vercel.app/?subject=Essay%20Writing%20%26%20College%20Apps&format=oneToTwo&tier=pack12&source=carrd"
    }
  };

  var subjectTemplates = {
    "ap-english-language-composition": {
      badge: "Advanced Placement",
      tone: "tone-stone",
      description: "Rhetorical analysis, argument construction, and essay technique built for the AP exam and beyond.",
      icon: '<svg viewBox="0 0 24 24"><path d="M12.67 19a2 2 0 0 0 1.416-.588l6.154-6.172a6 6 0 0 0-8.49-8.49L5.586 9.914A2 2 0 0 0 5 11.328V18a1 1 0 0 0 1 1z"></path><path d="M16 8 2 22"></path><path d="M17.5 15H9"></path></svg>'
    },
    "ap-psychology": {
      badge: "Advanced Placement",
      tone: "tone-green",
      description: "Clear frameworks for cognition, behaviour, and research methods, with structured revision for the FRQ.",
      icon: '<svg viewBox="0 0 24 24"><path d="M12 18V5"></path><path d="M15 13a4.17 4.17 0 0 1-3-4 4.17 4.17 0 0 1-3 4"></path><path d="M17.598 6.5A3 3 0 1 0 12 5a3 3 0 1 0-5.598 1.5"></path><path d="M17.997 5.125a4 4 0 0 1 2.526 5.77"></path><path d="M18 18a4 4 0 0 0 2-7.464"></path><path d="M19.967 17.483A4 4 0 1 1 12 18a4 4 0 1 1-7.967-.517"></path><path d="M6 18a4 4 0 0 1-2-7.464"></path><path d="M6.003 5.125a4 4 0 0 0-2.526 5.77"></path></svg>'
    },
    "english-literature": {
      badge: "Secondary & Leaving Cert",
      tone: "tone-stone",
      description: "Close reading, unseen texts, and elegant essay planning for state exams and college applications.",
      icon: '<svg viewBox="0 0 24 24"><path d="M12 7v14"></path><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"></path></svg>'
    },
    "essay-writing-college-apps": {
      badge: "Personal statement",
      tone: "tone-blue",
      description: "Voice, structure, and clarity for personal statements and admissions essays that sound like the student.",
      icon: '<svg viewBox="0 0 24 24"><path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"></path><path d="M22 10v6"></path><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"></path></svg>'
    },
    "elegant-essays": {
      badge: "Essay writing",
      tone: "tone-gold",
      description: "Refined structure and polished prose for essays that need to read effortlessly and persuade with clarity.",
      icon: '<svg viewBox="0 0 24 24"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>'
    }
  };

  var fallbackSubjects = [
    { id: "ap-english-language-composition", name: "AP English Language & Composition", slug: "ap-english-language-composition" },
    { id: "ap-psychology", name: "AP Psychology", slug: "ap-psychology" },
    { id: "english-literature", name: "English Literature", slug: "english-literature" },
    { id: "essay-writing-college-apps", name: "Essay Writing & College Apps", slug: "essay-writing-college-apps" },
    { id: "elegant-essays", name: "Elegant Essays", slug: "elegant-essays" }
  ];

  var bookingLinks = fallbackBookingLinks;
  var overlay = document.getElementById("fbBookModalOverlay");
  var slider = document.getElementById("fbSubjectSlider");
  var track = slider ? slider.querySelector(".fb-slider-track") : null;
  var subjectHeading = overlay ? overlay.querySelector("#fbBookModalSubject") : null;
  var closeBtn = overlay ? overlay.querySelector(".fb-book-modal-close") : null;
  var cancelBtn = overlay ? overlay.querySelector(".fb-book-modal-cancel") : null;
  var currentSubject = null;
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
    var tab = window.open(url, "_blank");
    if (tab) {
      tab.focus();
    }
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
    var toneCycle = ["tone-stone", "tone-green", "tone-gold", "tone-blue"];
    return {
      badge: template ? template.badge : "Tutoring",
      tone: template ? template.tone : toneCycle[index % toneCycle.length],
      description: template
        ? template.description
        : (subject.note || "Tailored tutoring sessions, packages, and availability synced from the dashboard."),
      icon: template
        ? template.icon
        : '<svg viewBox="0 0 24 24"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>'
    };
  }

  function buildSubjectCard(subject, index) {
    var meta = subjectMeta(subject, index);
    var mappedCount = Number(subject.mappedCount || 0);
    var note = mappedCount > 0
      ? meta.description
      : (subject.note || "Add matching lesson types in the dashboard to connect this subject.");

    return [
      '<article class="fb-subject-card">',
      '<div class="fb-card-visual ' + meta.tone + '">',
      '<span>' + escapeHtml(meta.badge) + '</span>',
      meta.icon,
      '</div>',
      '<div class="fb-card-body">',
      '<h3>' + escapeHtml(subject.name) + '</h3>',
      '<p>' + escapeHtml(note) + '</p>',
      '<div class="fb-card-actions">',
      '<span class="fb-learn-link">Learn more</span>',
      '<button type="button" class="fb-book-link" data-subject="' + escapeHtml(subject.name) + '">Book this ↗</button>',
      '</div>',
      '</div>',
      '</article>'
    ].join("");
  }

  function renderSubjects(subjects) {
    if (!track || !Array.isArray(subjects) || isRendering) {
      return;
    }

    isRendering = true;
    var scrollLeft = track.scrollLeft;
    track.innerHTML = subjects.map(buildSubjectCard).join("");
    track.scrollLeft = scrollLeft;
    isRendering = false;
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
        .filter(function (service) { return service.active !== false; })
        .forEach(function (service) {
          var subject = activeSubjects.find(function (item) { return item.id === service.subjectId; });
          if (!subject || !nextLinks[subject.name]) {
            return;
          }

          var url = new URL(API_BASE + "/");
          url.searchParams.set("subject", subject.name);
          url.searchParams.set("format", service.format);
          url.searchParams.set("tier", service.tier);
          url.searchParams.set("source", "carrd");

          nextLinks[subject.name][tierKey(service.tier) + ":" + sizeKey(service.format)] = url.toString();
        });

      bookingLinks = nextLinks;
      renderSubjects(activeSubjects);
      return true;
    } catch {
      bookingLinks = fallbackBookingLinks;
      return false;
    }
  }

  function openModal(subject) {
    currentSubject = subject;
    if (subjectHeading) {
      subjectHeading.textContent = subject;
    }
    overlay.classList.add("is-open");
  }

  function closeModal() {
    overlay.classList.remove("is-open");
    currentSubject = null;
  }

  function initModal() {
    if (!overlay || !track) {
      return;
    }

    track.addEventListener("click", function (event) {
      var btn = event.target.closest(".fb-book-link");
      if (!btn) {
        return;
      }
      openModal(btn.getAttribute("data-subject"));
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
      if (event.key === "Escape" && overlay.classList.contains("is-open")) {
        closeModal();
      }
    });

    overlay.querySelectorAll(".fb-price-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (!currentSubject) {
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
    initModal();

    renderSubjects(fallbackSubjects);

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
