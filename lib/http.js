function parseAllowedOrigins() {
  return (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
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
  sendJson
};
