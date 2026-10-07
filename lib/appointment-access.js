const crypto = require("node:crypto");
const { resolvePublicOrigin } = require("./http");

const ACCESS_TOKEN_VERSION = "v2";
const ACCESS_TOKEN_TTL_SECONDS = 400 * 24 * 60 * 60;

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function signingSecret() {
  return cleanString(process.env.APPOINTMENT_ACCESS_SECRET) ||
    cleanString(process.env.PACKAGE_PROFILE_SIGNING_SECRET) ||
    cleanString(process.env.STRIPE_SECRET_KEY);
}

function sign(secret, value) {
  return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}

function appointmentAccessToken(appointmentId, email, now = Date.now()) {
  const secret = signingSecret();
  const id = cleanString(String(appointmentId || ""));
  const recipient = cleanString(email).toLowerCase();
  if (!secret || !id || !recipient) return "";
  const expiresAt = Math.floor(now / 1000) + ACCESS_TOKEN_TTL_SECONDS;
  const signature = sign(secret, `${ACCESS_TOKEN_VERSION}|${id}|${recipient}|${expiresAt}`);
  return `${ACCESS_TOKEN_VERSION}.${expiresAt}.${signature}`;
}

function isValidAppointmentAccess(appointmentId, email, token, now = Date.now()) {
  const secret = signingSecret();
  const id = cleanString(String(appointmentId || ""));
  const recipient = cleanString(email).toLowerCase();
  const supplied = cleanString(token);
  if (!secret || !id || !recipient || !supplied) return false;

  const match = supplied.match(/^v2\.(\d{10})\.([A-Za-z0-9_-]{43})$/);
  if (match) {
    const expiresAt = Number(match[1]);
    if (!Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(now / 1000)) return false;
    const expected = sign(secret, `${ACCESS_TOKEN_VERSION}|${id}|${recipient}|${expiresAt}`);
    const actualBytes = Buffer.from(match[2]);
    const expectedBytes = Buffer.from(expected);
    return actualBytes.length === expectedBytes.length && crypto.timingSafeEqual(actualBytes, expectedBytes);
  }

  // Preserve links already sent before expiry-bearing tokens were introduced.
  const expectedLegacy = sign(secret, `${id}|${recipient}`);
  const actualBytes = Buffer.from(supplied);
  const expectedBytes = Buffer.from(expectedLegacy);
  return actualBytes.length === expectedBytes.length && crypto.timingSafeEqual(actualBytes, expectedBytes);
}

function buildAppointmentManagementUrl(appointmentId, email, origin) {
  const token = appointmentAccessToken(appointmentId, email);
  if (!token) return "";
  const url = new URL("/manage-lesson.html", resolvePublicOrigin(origin || "https://backend-ymlj.vercel.app"));
  url.searchParams.set("appointmentId", cleanString(String(appointmentId)));
  url.searchParams.set("access", token);
  return url.toString();
}

module.exports = { appointmentAccessToken, buildAppointmentManagementUrl, isValidAppointmentAccess };
