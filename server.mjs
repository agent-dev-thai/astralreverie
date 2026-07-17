import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT_DIR = fileURLToPath(new URL(".", import.meta.url));
const ASSETS_DIR = resolve(ROOT_DIR, "assets");
const PUBLIC_ROOT_FILES = new Set([
  "app.js",
  "gacha-core.js",
  "index.html",
  "logic.js",
  "strings.js",
  "styles.css",
]);
const PUBLIC_ASSET_EXTENSIONS = new Set([".png", ".ttf", ".webp"]);
const CONTENT_TYPES = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".ttf", "font/ttf"],
  [".webp", "image/webp"],
]);

function applyCommonHeaders(response) {
  response.setHeader("Referrer-Policy", "same-origin");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
}

function sendText(response, statusCode, body, method = "GET") {
  const payload = Buffer.from(body);
  response.writeHead(statusCode, {
    "Content-Length": payload.byteLength,
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(method === "HEAD" ? undefined : payload);
}

function resolvePublicFile(pathname) {
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    return undefined;
  }

  const relativePath = decodedPath.replace(/^\/+/, "") || "index.html";
  const segments = relativePath.split("/");
  if (
    relativePath.includes("\\")
    || segments.some(segment => !segment || segment === "." || segment === "..")
  ) {
    return undefined;
  }

  if (PUBLIC_ROOT_FILES.has(relativePath)) {
    return resolve(ROOT_DIR, relativePath);
  }

  if (segments[0] !== "assets" || !PUBLIC_ASSET_EXTENSIONS.has(extname(relativePath))) {
    return undefined;
  }

  const candidate = resolve(ROOT_DIR, relativePath);
  return candidate.startsWith(`${ASSETS_DIR}${sep}`) ? candidate : undefined;
}

async function handleRequest(request, response) {
  applyCommonHeaders(response);
  const method = request.method || "GET";
  if (method !== "GET" && method !== "HEAD") {
    response.setHeader("Allow", "GET, HEAD");
    sendText(response, 405, "Method not allowed\n", method);
    return;
  }

  const url = new URL(request.url || "/", "http://localhost");
  if (url.pathname === "/health") {
    const payload = Buffer.from(JSON.stringify({ status: "ok" }));
    response.writeHead(200, {
      "Content-Length": payload.byteLength,
      "Content-Type": CONTENT_TYPES.get(".json"),
      "Cache-Control": "no-store",
    });
    response.end(method === "HEAD" ? undefined : payload);
    return;
  }

  const filePath = resolvePublicFile(url.pathname);
  if (!filePath) {
    sendText(response, 404, "Not found\n", method);
    return;
  }

  let fileStats;
  try {
    fileStats = await stat(filePath);
  } catch (error) {
    if (error && error.code === "ENOENT") {
      sendText(response, 404, "Not found\n", method);
      return;
    }
    throw error;
  }

  if (!fileStats.isFile()) {
    sendText(response, 404, "Not found\n", method);
    return;
  }

  const extension = extname(filePath);
  response.writeHead(200, {
    "Content-Length": fileStats.size,
    "Content-Type": CONTENT_TYPES.get(extension) || "application/octet-stream",
    "Cache-Control": filePath.startsWith(`${ASSETS_DIR}${sep}`)
      ? "public, max-age=3600"
      : "no-cache",
  });

  if (method === "HEAD") {
    response.end();
    return;
  }

  createReadStream(filePath).pipe(response);
}

export function createAppServer() {
  return createServer((request, response) => {
    handleRequest(request, response).catch(error => {
      console.error("Request failed", error);
      if (!response.headersSent) {
        applyCommonHeaders(response);
        sendText(response, 500, "Internal server error\n");
      } else {
        response.destroy(error);
      }
    });
  });
}

function readPort(rawPort) {
  const port = Number.parseInt(rawPort || "3000", 10);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT: ${rawPort}`);
  }
  return port;
}

const entryPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (import.meta.url === entryPath) {
  const host = process.env.HOST || "0.0.0.0";
  const port = readPort(process.env.PORT);
  const server = createAppServer();

  server.listen(port, host, () => {
    console.log(`Astral Reverie listening on http://${host}:${port}`);
  });

  const shutdown = () => server.close(error => {
    if (error) {
      console.error("Server shutdown failed", error);
      process.exitCode = 1;
    }
  });
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

