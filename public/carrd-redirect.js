(() => {
  const defaultTarget = "https://backend-ymlj.vercel.app/";

  function buildTarget(el) {
    const url = new URL(el.dataset.finbarBookingUrl || defaultTarget);
    const mapping = {
      subject: el.dataset.subject,
      format: el.dataset.format,
      tier: el.dataset.tier,
      appointmentTypeID: el.dataset.appointmentTypeId
    };

    Object.entries(mapping).forEach(([key, value]) => {
      if (value) {
        url.searchParams.set(key, value);
      }
    });

    url.searchParams.set("source", "carrd");
    return url.toString();
  }

  function wire(el) {
    const target = buildTarget(el);

    if (el.tagName === "A") {
      el.href = target;
    }

    el.addEventListener("click", (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.button === 1) {
        return;
      }

      event.preventDefault();
      location.href = target;
    });
  }

  document.querySelectorAll("[data-finbar-booking]").forEach(wire);
})();
