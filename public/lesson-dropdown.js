(function () {
  var bookingLinks = {
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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
