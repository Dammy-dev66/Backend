const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const root = process.cwd();
const port = Number(process.env.PORT || 4174);
const staticRoot = path.join(root, "public");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

function sendFile(res, filePath) {
  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }

    res.writeHead(200, {
      "Content-Type": MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream"
    });
    res.end(data);
  });
}

function resolveStaticPath(reqPath) {
  const cleanPath = decodeURIComponent(reqPath.split("?")[0] || "/");

  if (cleanPath === "/") {
    return path.join(staticRoot, "index.html");
  }

  if (cleanPath.startsWith("/api/")) {
    return null;
  }

  const rel = cleanPath.replace(/^\//, "");
  const candidate = path.join(root, rel.startsWith("public/") ? rel : path.join("public", rel));
  if (!candidate.startsWith(root)) {
    return null;
  }
  return candidate;
}

function createResponse(res) {
  res.writeHead = res.writeHead.bind(res);
  return res;
}

async function loadApiHandler(routeName) {
  const filePath = path.join(root, "api", `${routeName}.js`);
  const exists = fs.existsSync(filePath);
  if (!exists) {
    return null;
  }

  return require(filePath);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1"}`);

    if (url.pathname.startsWith("/api/")) {
      const routeName = url.pathname.replace(/^\/api\//, "");
      const handler = await loadApiHandler(routeName);
      if (!handler) {
        res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ ok: false, error: "API route not found." }));
        return;
      }

      req.url = url.pathname + url.search;
      await handler(req, createResponse(res));
      return;
    }

    const staticPath = resolveStaticPath(url.pathname);
    if (!staticPath) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }

    sendFile(res, staticPath);
  } catch (error) {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(error.message || "Server error");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Finbar local dev server running at http://127.0.0.1:${port}`);
});

