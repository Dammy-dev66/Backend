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

async function listCertificates({ email, appointmentTypeID, orderID, productID }) {
  const query = buildQuery({
    email,
    appointmentTypeID,
    orderID,
    productID
  });

  return acuityRequest(`/certificates?${query}`);
}

function normalizeCertificateList(response) {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.certificates)) {
    return response.certificates;
  }

  if (Array.isArray(response?.results)) {
    return response.results;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  return [];
}

function extractCertificateCode(certificate) {
  if (!certificate || typeof certificate !== "object") {
    return typeof certificate === "string" || typeof certificate === "number"
      ? String(certificate)
      : "";
  }

  return String(
    certificate.certificate ??
      certificate.code ??
      certificate.certificateCode ??
      certificate.id ??
      certificate.packageCode ??
      ""
  ).trim();
}

async function resolvePackageCertificate({ email, appointmentTypeID, orderID, productID }) {
  const certificates = normalizeCertificateList(
    await listCertificates({ email, appointmentTypeID, orderID, productID })
  );
  let lastError = null;

  for (const certificate of certificates) {
    const code = extractCertificateCode(certificate);
    if (!code) {
      continue;
    }

    try {
      const certificateStatus = await checkCertificate({
        certificate: code,
        appointmentTypeID,
        email
      });

      return {
        certificate: code,
        certificateStatus,
        source: certificate
      };
    } catch (error) {
      lastError = error;
      const acuityError = error.acuity?.error;
      if (!["invalid_certificate", "expired_certificate", "certificate_uses", "invalid_certificate_type"].includes(acuityError)) {
        throw error;
      }
    }
  }

  const error = new Error(lastError?.message || "No active package could be found for that email.");
  error.statusCode = 404;
  if (lastError?.acuity) {
    error.acuity = lastError.acuity;
  }
  throw error;
}

async function createAppointment(payload) {
  return acuityRequest("/appointments", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

async function createCertificate(payload) {
  return acuityRequest("/certificates", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

module.exports = {
  checkCertificate,
  createAppointment,
  createCertificate,
  extractCertificateCode,
  listCertificates,
  normalizeCertificateList,
  resolvePackageCertificate
};
