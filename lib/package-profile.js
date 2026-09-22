const crypto = require("crypto");

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function signingSecret() {
  return cleanString(process.env.PACKAGE_PROFILE_SIGNING_SECRET) || cleanString(process.env.STRIPE_SECRET_KEY);
}

function profileToken({ orderID, certificate, email }) {
  const secret = signingSecret();
  if (!secret || !orderID || !certificate || !email) return "";

  return crypto
    .createHmac("sha256", secret)
    .update([orderID, certificate, email.toLowerCase()].join("|"))
    .digest("base64url");
}

function isValidProfileToken(input) {
  const supplied = cleanString(input.token);
  const expected = profileToken(input);
  if (!supplied || !expected || supplied.length !== expected.length) return false;

  return crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
}

module.exports = {
  profileToken,
  isValidProfileToken
};
