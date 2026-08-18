const ACUITY_BASE_URL = "https://acuityscheduling.com/api/v1";

function acuityAuthHeader() {
  const userId = process.env.ACUITY_USER_ID;
  const apiKey = process.env.ACUITY_API_KEY;

  if (!userId || !apiKey) {
    const error = new Error("Acuity credentials are not configured.");
    error.statusCode = 500;
    throw error;
  }

  return `Basic ${Buffer.from(`${userId}:${apiKey}`).toString("base64")}`;
}

async function acuityRequest(path, options = {}) {
  const response = await fetch(`${ACUITY_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: acuityAuthHeader(),
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const error = new Error(data?.message || `Acuity request failed with ${response.status}.`);
    error.statusCode = response.status;
    error.acuity = data;
    throw error;
  }

  return data;
}

function buildQuery(params) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  }

  return search.toString();
}

async function checkCertificate({ certificate, appointmentTypeID, email }) {
  const query = buildQuery({ certificate, appointmentTypeID, email });
  return acuityRequest(`/certificates/check?${query}`);
}

async function createAppointment(payload) {
  return acuityRequest("/appointments", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

module.exports = {
  checkCertificate,
  createAppointment
};
