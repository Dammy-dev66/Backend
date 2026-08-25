(() => {
  const API = "/api/admin/coupons";
  const adminKeyInput = document.createElement("input");
  adminKeyInput.type = "password";
  adminKeyInput.placeholder = "Admin key";
  adminKeyInput.className = "admin-key-input";
  adminKeyInput.autocomplete = "current-password";

  const couponList = document.getElementById("couponList");
  const packageList = document.getElementById("packageList");
  const adminError = document.getElementById("adminError");
  const adminStatus = document.getElementById("adminStatus");
  const refreshBtn = document.getElementById("refreshBtn");
  const addCouponBtn = document.getElementById("addCouponBtn");
  const saveBtn = document.getElementById("saveBtn");
  const codeInput = document.getElementById("codeInput");
  const percentInput = document.getElementById("percentInput");
  const labelInput = document.getElementById("labelInput");
  const messageInput = document.getElementById("messageInput");
  const activeInput = document.getElementById("activeInput");

  document.querySelector(".admin-toolbar").prepend(adminKeyInput);

  const state = {
    coupons: [],
    packageCatalog: [],
    selectedIndex: -1
  };

  function getAdminKey() {
    return adminKeyInput.value.trim() || sessionStorage.getItem("finbarAdminKey") || "";
  }

  function setAdminKey(value) {
    sessionStorage.setItem("finbarAdminKey", value);
  }

  function showError(message) {
    adminError.textContent = message;
    adminError.classList.toggle("hidden", !message);
  }

  function showStatus(message) {
    adminStatus.textContent = message || "";
  }

  function selectedPackageKeys() {
    return Array.from(packageList.querySelectorAll("input[type='checkbox']:checked")).map((input) => input.value);
  }

  function renderPackageList() {
    packageList.innerHTML = state.packageCatalog.map((item) => `
      <label class="package-check">
        <input type="checkbox" value="${item.key}">
        <span>${item.label}</span>
      </label>
    `).join("");
  }

  function fillEditor(coupon) {
    codeInput.value = coupon?.code || "";
    percentInput.value = coupon?.percent ?? "";
    labelInput.value = coupon?.label || "";
    messageInput.value = coupon?.message || "";
    activeInput.checked = coupon?.active !== false;

    const keys = new Set(coupon?.packageKeys || []);
    packageList.querySelectorAll("input[type='checkbox']").forEach((input) => {
      input.checked = keys.has(input.value) || keys.has("*");
    });
  }

  function currentEditorCoupon() {
    return {
      code: codeInput.value.trim(),
      percent: Number(percentInput.value),
      label: labelInput.value.trim(),
      message: messageInput.value.trim(),
      active: activeInput.checked,
      packageKeys: selectedPackageKeys()
    };
  }

  function renderCoupons() {
    couponList.innerHTML = "";

    if (!state.coupons.length) {
      couponList.innerHTML = `<p class="muted">No coupons saved yet.</p>`;
      return;
    }

    state.coupons.forEach((coupon, index) => {
      const row = document.createElement("button");
      row.type = "button";
      row.className = `coupon-row${index === state.selectedIndex ? " active" : ""}`;
      row.innerHTML = `
        <strong>${coupon.code}</strong>
        <span>${coupon.percent}% off${coupon.active === false ? " - inactive" : ""}</span>
        <small>${coupon.packageKeys.join(", ") || "All packages"}</small>
      `;
      row.addEventListener("click", () => {
        state.selectedIndex = index;
        fillEditor(coupon);
        renderCoupons();
      });
      couponList.appendChild(row);
    });
  }

  async function api(method, body) {
    const key = getAdminKey();
    if (!key) {
      throw new Error("Enter the admin key first.");
    }

    setAdminKey(key);

    const res = await fetch(API, {
      method,
      headers: {
        "Content-Type": "application/json",
        "x-finbar-admin-key": key
      },
      body: body ? JSON.stringify(body) : undefined
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      throw new Error(data.error || "Unable to load coupon settings.");
    }
    return data;
  }

  async function load() {
    showError("");
    showStatus("Loading...");
    const data = await api("GET");
    state.coupons = data.coupons || [];
    state.packageCatalog = data.packageCatalog || [];
    if (!state.packageCatalog.length && !packageList.childElementCount) {
      renderPackageList();
    } else {
      renderPackageList();
    }
    state.selectedIndex = state.coupons.length ? 0 : -1;
    renderCoupons();
    if (state.selectedIndex >= 0) {
      fillEditor(state.coupons[state.selectedIndex]);
    } else {
      fillEditor(null);
    }
    showStatus(`Loaded ${state.coupons.length} coupon(s).`);
  }

  refreshBtn.addEventListener("click", () => load().catch((error) => showError(error.message)));

  addCouponBtn.addEventListener("click", () => {
    state.selectedIndex = -1;
    fillEditor({
      code: "",
      percent: 10,
      label: "",
      message: "",
      active: true,
      packageKeys: state.packageCatalog.map((item) => item.key)
    });
    renderCoupons();
  });

  saveBtn.addEventListener("click", async () => {
    showError("");
    try {
      const edited = currentEditorCoupon();
      if (!edited.code || !Number.isFinite(edited.percent) || edited.percent <= 0) {
        throw new Error("Coupon code and percent are required.");
      }

      const nextCoupons = [...state.coupons];
      const normalized = {
        code: edited.code.toUpperCase(),
        percent: Math.max(1, Math.min(100, Math.round(edited.percent))),
        label: edited.label || "",
        message: edited.message,
        active: edited.active,
        packageKeys: edited.packageKeys.length ? edited.packageKeys : state.packageCatalog.map((item) => item.key)
      };

      const existingIndex = nextCoupons.findIndex((item) => item.code === normalized.code);
      if (existingIndex >= 0) {
        nextCoupons[existingIndex] = normalized;
        state.selectedIndex = existingIndex;
      } else {
        nextCoupons.unshift(normalized);
        state.selectedIndex = 0;
      }

      const data = await api("PUT", { coupons: nextCoupons });
      state.coupons = data.coupons || [];
      renderCoupons();
      fillEditor(state.coupons[state.selectedIndex] || null);
      showStatus("Coupon settings saved.");
    } catch (error) {
      showError(error.message);
    }
  });

  adminKeyInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      load().catch((error) => showError(error.message));
    }
  });

  load().catch((error) => {
    showStatus("");
    showError(error.message);
  });
})();
