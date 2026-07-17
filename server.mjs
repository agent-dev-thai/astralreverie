import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { constants as zlibConstants, createBrotliCompress, createGzip } from "node:zlib";

const ROOT_DIR = fileURLToPath(new URL(".", import.meta.url));
const ASSETS_DIR = resolve(ROOT_DIR, "assets");
const PUBLIC_ROOT_FILES = new Set([
  "app.js",
  "cinematic-media.js",
  "cinematic-sfx.js",
  "gacha-core.js",
  "index.html",
  "logic.js",
  "strings.js",
  "styles.css",
]);
const PUBLIC_ASSET_EXTENSIONS = new Set([".js", ".json", ".m4a", ".mp4", ".png", ".ttf", ".webp"]);
const COMPRESSIBLE_EXTENSIONS = new Set([".css", ".html", ".js", ".json", ".ttf"]);
const CONTENT_TYPES = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".m4a", "audio/mp4"],
  [".mp4", "video/mp4"],
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

function fileEtag(fileStats, variant = "identity") {
  return `"${fileStats.size.toString(16)}-${Math.trunc(fileStats.mtimeMs).toString(16)}-${variant}"`;
}

function etagMatches(header, etag) {
  if (!header) return false;
  return header.split(",").some(value => value.trim() === etag || value.trim() === "*");
}

function parseByteRange(header, size) {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match || (!match[1] && !match[2])) return false;

  let start;
  let end;
  if (match[1]) {
    start = Number.parseInt(match[1], 10);
    end = match[2] ? Number.parseInt(match[2], 10) : size - 1;
  } else {
    const suffixLength = Number.parseInt(match[2], 10);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) return false;
    start = Math.max(0, size - suffixLength);
    end = size - 1;
  }

  if (
    !Number.isSafeInteger(start)
    || !Number.isSafeInteger(end)
    || start < 0
    || start >= size
    || start > end
  ) {
    return false;
  }
  return { start, end: Math.min(end, size - 1) };
}

function preferredEncoding(request, extension, hasRange) {
  if (hasRange || request.method === "HEAD" || !COMPRESSIBLE_EXTENSIONS.has(extension)) return null;
  const accepted = request.headers["accept-encoding"] || "";
  if (/(^|,)\s*br\s*(,|$)/i.test(accepted)) return "br";
  if (/(^|,)\s*gzip\s*(,|$)/i.test(accepted)) return "gzip";
  return null;
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
  const encoding = preferredEncoding(request, extension, Boolean(request.headers.range));
  const etag = fileEtag(fileStats, encoding || "identity");
  const lastModified = fileStats.mtime.toUTCString();
  const cacheControl = filePath.startsWith(`${ASSETS_DIR}${sep}`)
    ? "public, max-age=86400, stale-while-revalidate=604800"
    : "no-cache";
  const baseHeaders = {
    "Content-Type": CONTENT_TYPES.get(extension) || "application/octet-stream",
    "Cache-Control": cacheControl,
    "Accept-Ranges": "bytes",
    ETag: etag,
    "Last-Modified": lastModified,
    ...(COMPRESSIBLE_EXTENSIONS.has(extension) ? { Vary: "Accept-Encoding" } : {}),
  };

  if (etagMatches(request.headers["if-none-match"], etag)) {
    response.writeHead(304, baseHeaders);
    response.end();
    return;
  }

  const ifRange = request.headers["if-range"];
  const requestedRange = ifRange && ifRange !== etag && ifRange !== lastModified
    ? null
    : parseByteRange(request.headers.range, fileStats.size);
  if (requestedRange === false) {
    response.writeHead(416, {
      ...baseHeaders,
      "Content-Range": `bytes */${fileStats.size}`,
      "Content-Length": 0,
    });
    response.end();
    return;
  }

  if (requestedRange) {
    const contentLength = requestedRange.end - requestedRange.start + 1;
    response.writeHead(206, {
      ...baseHeaders,
      "Content-Length": contentLength,
      "Content-Range": `bytes ${requestedRange.start}-${requestedRange.end}/${fileStats.size}`,
    });
    if (method === "HEAD") {
      response.end();
      return;
    }
    createReadStream(filePath, requestedRange).pipe(response);
    return;
  }

  response.writeHead(200, {
    ...baseHeaders,
    ...(encoding ? { "Content-Encoding": encoding } : { "Content-Length": fileStats.size }),
  });

  if (method === "HEAD") {
    response.end();
    return;
  }

  const source = createReadStream(filePath);
  if (encoding === "br") {
    source.pipe(createBrotliCompress({
      params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 4 },
    })).pipe(response);
    return;
  }
  if (encoding === "gzip") {
    source.pipe(createGzip({ level: 6 })).pipe(response);
    return;
  }
  source.pipe(response);
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
