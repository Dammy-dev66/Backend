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
    var name = String(subject.name || "").trim().toLowerCase();
    var anchors = {
      "ap english language": "#ap-english-language",
      "ap english language & composition": "#ap-english-language",
      "ap psychology": "#ap-psychology",
      "english literature": "#english-literature",
      "essay writing": "#essay-writing",
      "elegant essays": "#elegant-essays"
    };

    return anchors[name] || "#" + subjectSlug(subject);
  }

  function buildSubjectCard(subject, index) {
    var meta = subjectMeta(subject, index);
    var courseInfoUrl = subject.courseInfoUrl || subject.infoUrl || courseInfoAnchor(subject);

    return [
      '<article class="fb-subject-card ' + meta.tone + '">',
      '<div class="fb-subject-card__content">',
      '<p class="fb-subject-card__eyebrow">' + escapeHtml(meta.badge) + '</p>',
      '<h3>' + escapeHtml(subject.name) + '</h3>',
      '<div class="fb-subject-card__actions">',
      '<a class="fb-subject-info-link" href="' + escapeHtml(courseInfoUrl) + '">Course info <span aria-hidden="true">↗</span></a>',
      '<button type="button" class="fb-book-link" data-subject="' + escapeHtml(subject.name) + '">Book now</button>',
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
    slider.classList.toggle("fb-subject-slider--five", subjects.length === 5);
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
