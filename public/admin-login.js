(() => {
  const form = document.getElementById("adminLoginForm");
  const keyInput = document.getElementById("adminLoginKey");
  const error = document.getElementById("loginError");
  const message = document.getElementById("loginMessage");
  const submit = document.getElementById("loginSubmit");

  if (new URLSearchParams(window.location.search).get("reason") === "expired") {
    message.textContent = "Your previous session has ended. Enter your access code to continue.";
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const key = keyInput.value.trim();
    error.textContent = "";
    error.classList.add("hidden");

    if (!key) {
      error.textContent = "Enter your access code to continue.";
      error.classList.remove("hidden");
      keyInput.focus();
      return;
    }

    submit.disabled = true;
    submit.textContent = "Checking access...";
    try {
      const response = await fetch("/api/admin/auth", {
        headers: { "x-finbar-admin-key": key }
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || "We could not verify that code.");
      sessionStorage.setItem("finbarAdminKey", key);
      window.location.replace("/admin.html");
    } catch (requestError) {
      error.textContent = requestError.message === "Unauthorized." ? "That access code is not recognised. Please try again." : requestError.message;
      error.classList.remove("hidden");
      submit.disabled = false;
      submit.textContent = "Open dashboard";
      keyInput.focus();
      keyInput.select();
    }
  });
})();
