(function () {
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

  var bookingLinks = fallbackBookingLinks;
  var overlay = document.getElementById("fbBookModalOverlay");
  var subjectHeading = overlay ? overlay.querySelector("#fbBookModalSubject") : null;
  var closeBtn = overlay ? overlay.querySelector(".fb-book-modal-close") : null;
  var cancelBtn = overlay ? overlay.querySelector(".fb-book-modal-cancel") : null;
  var currentSubject = null;

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

  async function loadBookingConfig() {
    try {
      var response = await fetch("https://backend-ymlj.vercel.app/api/booking-config");
      var data = await response.json().catch(function () { return {}; });
      if (!response.ok || !data || !data.ok || !Array.isArray(data.subjects) || !Array.isArray(data.services)) {
        return;
      }

      var nextLinks = {};
      data.subjects
        .filter(function (subject) { return subject.active !== false; })
        .forEach(function (subject) {
          nextLinks[subject.name] = {};
        });

      data.services
        .filter(function (service) { return service.active !== false; })
        .forEach(function (service) {
          var subject = data.subjects.find(function (item) { return item.id === service.subjectId; });
          if (!subject || subject.active === false || !nextLinks[subject.name]) {
            return;
          }

          var url = new URL("https://backend-ymlj.vercel.app/");
          url.searchParams.set("subject", subject.name);
          url.searchParams.set("format", service.format);
          url.searchParams.set("tier", service.tier);
          url.searchParams.set("source", "carrd");

          nextLinks[subject.name][tierKey(service.tier) + ":" + sizeKey(service.format)] = url.toString();
        });

      bookingLinks = nextLinks;
    } catch {
      bookingLinks = fallbackBookingLinks;
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

  function init() {
    if (!overlay) {
      return;
    }

    document.querySelectorAll(".fb-book-link").forEach(function (btn) {
      btn.addEventListener("click", function () {
        openModal(btn.getAttribute("data-subject"));
      });
    });

    if (closeBtn) {
      closeBtn.addEventListener("click", closeModal);
    }
    if (cancelBtn) {
      cancelBtn.addEventListener("click", closeModal);
    }

    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) {
        closeModal();
      }
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && overlay.classList.contains("is-open")) {
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

  function boot() {
    loadBookingConfig().finally(init);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
