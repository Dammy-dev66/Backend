function isLoopbackHostname(hostname) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname.endsWith(".localhost");
}

function isLoopbackOrigin(origin) {
  if (!origin) return false;

  try {
    return isLoopbackHostname(new URL(origin).hostname);
  } catch {
    return false;
  }
}

function parseAllowedOrigins() {
  return (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function resolveBaseOrigin(req, fallback = "https://backend-ymlj.vercel.app") {
  const allowedOrigins = parseAllowedOrigins().filter((origin) => !isLoopbackOrigin(origin));
  const requestOrigin = req?.headers?.origin;
  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    return requestOrigin;
  }

  return allowedOrigins[0] || fallback;
}

function resolvePublicOrigin(fallback = "https://backend-ymlj.vercel.app") {
  const configured = (process.env.PUBLIC_SITE_ORIGIN || process.env.APP_ORIGIN || "").trim();
  if (configured && !isLoopbackOrigin(configured)) {
    return configured;
  }

  const allowedOrigins = parseAllowedOrigins().filter((origin) => !isLoopbackOrigin(origin));
  return allowedOrigins[0] || fallback;
}

function resolveConfiguredUrl(value, fallbackOrigin, fallbackPath) {
  const trimmed = (value || "").trim();
  if (trimmed) {
    try {
      const parsed = new URL(trimmed);
      if (!isLoopbackOrigin(parsed.origin)) {
        return parsed.toString();
      }
    } catch {
      // Ignore invalid configured URLs and fall through to the safe fallback.
    }
  }

  return new URL(fallbackPath, fallbackOrigin).toString();
}

function corsHeaders(req) {
  const allowedOrigins = parseAllowedOrigins();
  const requestOrigin = req.headers.origin;
  const origin = allowedOrigins.includes(requestOrigin) ? requestOrigin : allowedOrigins[0] || "";

  return {
    ...(origin ? { "Access-Control-Allow-Origin": origin } : {}),
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };
}

function sendJson(req, res, statusCode, body) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    ...corsHeaders(req)
  });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch {
    const error = new Error("Request body must be valid JSON.");
    error.statusCode = 400;
    throw error;
  }
}

function handleOptions(req, res) {
  if (req.method !== "OPTIONS") {
    return false;
  }

  res.writeHead(204, corsHeaders(req));
  res.end();
  return true;
}

module.exports = {
  handleOptions,
  readJson,
  sendJson,
  resolveBaseOrigin,
  resolvePublicOrigin,
  resolveConfiguredUrl,
  isLoopbackOrigin
};
