function vercelEnvironment() {
  const vercel = typeof process.env.VERCEL_ENV === "string" ? process.env.VERCEL_ENV.trim() : "";
  return vercel || (typeof process.env.NODE_ENV === "string" && process.env.NODE_ENV.trim()) || "development";
}

function isProductionRuntime() {
  return vercelEnvironment() === "production";
}

function scopedBlobPath(pathname) {
  const environment = vercelEnvironment();
  return environment !== "production" ? `${environment}/${pathname}` : pathname;
}

module.exports = { isProductionRuntime, scopedBlobPath, vercelEnvironment };
