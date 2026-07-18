import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  brotliCompressSync,
  constants as zlibConstants,
  createBrotliCompress,
  createGzip,
  gzipSync,
} from "node:zlib";

import { decodePullShareToken } from "./pull-share.js";
import { createPullOgRenderer, PULL_OG_PATH } from "./pull-og.js";
import { ITEMS } from "./strings.js";
import { normalizeMeasurementId } from "./analytics.js";

const ROOT_DIR = fileURLToPath(new URL(".", import.meta.url));
const ASSETS_DIR = resolve(ROOT_DIR, "assets");
const INDEX_PATH = resolve(ROOT_DIR, "index.html");
const STATIC_OG_PATH = resolve(ASSETS_DIR, "generated/share/astral-reverie-og.jpg");
const pullOgRenderer = createPullOgRenderer();
const PUBLIC_ROOT_FILES = new Set([
  "analytics.js",
  "app.js",
  "cinematic-media.js",
  "cinematic-sfx.js",
  "gacha-core.js",
  "index.html",
  "logic.js",
  "pull-share.js",
  "strings.js",
  "styles.css",
]);
const PUBLIC_ASSET_EXTENSIONS = new Set([".jpg", ".js", ".json", ".m4a", ".mp4", ".png", ".ttf", ".webmanifest", ".webp"]);
const COMPRESSIBLE_EXTENSIONS = new Set([".css", ".html", ".js", ".json", ".ttf"]);
const CONTENT_TYPES = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".jpg", "image/jpeg"],
  [".json", "application/json; charset=utf-8"],
  [".m4a", "audio/mp4"],
  [".mp4", "video/mp4"],
  [".png", "image/png"],
  [".ttf", "font/ttf"],
  [".webmanifest", "application/manifest+json; charset=utf-8"],
  [".webp", "image/webp"],
]);

function contentSecurityPolicy(analyticsEnabled = false) {
  const connectSources = ["'self'"];
  const imageSources = ["'self'", "data:"];
  const scriptSources = ["'self'"];
  if (analyticsEnabled) {
    connectSources.push(
      "https://*.google-analytics.com",
      "https://*.analytics.google.com",
      "https://*.googletagmanager.com",
    );
    imageSources.push("https://*.google-analytics.com", "https://*.googletagmanager.com");
    scriptSources.push("https://www.googletagmanager.com/gtag/js");
  }
  return [
    "default-src 'self'",
    "base-uri 'self'",
    `connect-src ${connectSources.join(" ")}`,
    "font-src 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    `img-src ${imageSources.join(" ")}`,
    "manifest-src 'self'",
    "media-src 'self'",
    "object-src 'none'",
    `script-src ${scriptSources.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
  ].join("; ");
}

function applyCommonHeaders(response, runtimeConfig = {}) {
  response.setHeader("Content-Security-Policy", contentSecurityPolicy(Boolean(runtimeConfig.gaMeasurementId)));
  response.setHeader("Permissions-Policy", "camera=(), geolocation=(), microphone=(), payment=(), usb=()");
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

function firstForwardedValue(value) {
  return Array.isArray(value) ? value[0] : String(value || "").split(",")[0].trim();
}

function publicOrigin(request, configuredOrigin) {
  if (configuredOrigin) return configuredOrigin;
  const forwardedProtocol = firstForwardedValue(request.headers["x-forwarded-proto"]);
  const protocol = forwardedProtocol === "https" ? "https" : "http";
  const host = firstForwardedValue(request.headers["x-forwarded-host"]) || request.headers.host || "localhost";
  try {
    return new URL(`${protocol}://${host}`).origin;
  } catch {
    return "http://localhost";
  }
}

function requestedSharedPull(request, origin) {
  const requestedUrl = new URL(request.url || "/", origin);
  const pullToken = requestedUrl.searchParams.get("pull");
  const results = decodePullShareToken(pullToken, ITEMS);
  return results ? { token: pullToken, results } : undefined;
}

function publicPageUrl(origin, sharedPull) {
  const pageUrl = new URL("/", origin);
  if (sharedPull) pageUrl.searchParams.set("pull", sharedPull.token);
  return pageUrl.href;
}

function publicOgImageUrl(origin, sharedPull) {
  if (!sharedPull) return `${origin}/assets/generated/share/astral-reverie-og.jpg`;
  const imageUrl = new URL(PULL_OG_PATH, origin);
  imageUrl.searchParams.set("pull", sharedPull.token);
  return imageUrl.href;
}

function escapeHtmlAttribute(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function publicOgImageAlt(sharedPull) {
  if (!sharedPull) return "Astral Reverie cinematic gacha simulator featuring Seren beside an eclipse gate.";
  const names = sharedPull.results.map(item => item.name);
  const visibleNames = names.slice(0, 4).join(", ");
  const remainder = names.length > 4 ? `, and ${names.length - 4} more` : "";
  return `Astral Reverie shared pull showing ${visibleNames}${remainder}.`;
}

async function sendIndex(request, response, method, runtimeConfig) {
  const template = await readFile(INDEX_PATH, "utf8");
  const origin = publicOrigin(request, runtimeConfig.publicOrigin);
  const sharedPull = requestedSharedPull(request, origin);
  const rendered = Buffer.from(template
    .replaceAll("__PUBLIC_ORIGIN__", origin)
    .replaceAll("__PUBLIC_PAGE_URL__", publicPageUrl(origin, sharedPull))
    .replaceAll("__PUBLIC_OG_IMAGE__", publicOgImageUrl(origin, sharedPull))
    .replaceAll("__PUBLIC_OG_IMAGE_ALT__", escapeHtmlAttribute(publicOgImageAlt(sharedPull)))
    .replaceAll("__GA_MEASUREMENT_ID__", escapeHtmlAttribute(runtimeConfig.gaMeasurementId)));
  const encoding = preferredEncoding(request, ".html", false);
  const payload = encoding === "br"
    ? brotliCompressSync(rendered, { params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 4 } })
    : encoding === "gzip" ? gzipSync(rendered, { level: 6 }) : rendered;
  response.writeHead(200, {
    "Content-Length": payload.byteLength,
    "Content-Type": CONTENT_TYPES.get(".html"),
    "Cache-Control": "no-cache",
    ...(encoding ? { "Content-Encoding": encoding } : {}),
    Vary: "Accept-Encoding, X-Forwarded-Host, X-Forwarded-Proto",
  });
  response.end(method === "HEAD" ? undefined : payload);
}

async function sendPullOg(request, response, method, requestUrl) {
  const token = requestUrl.searchParams.get("pull");
  const results = decodePullShareToken(token, ITEMS);
  if (!results) {
    sendText(response, 404, "Shared pull not found\n", method);
    return;
  }

  const etag = `"pull-og-v1-${token}"`;
  const baseHeaders = {
    "Content-Type": "image/jpeg",
    "Cache-Control": "public, max-age=31536000, immutable",
    ETag: etag,
  };
  if (etagMatches(request.headers["if-none-match"], etag)) {
    response.writeHead(304, baseHeaders);
    response.end();
    return;
  }

  let payload;
  let cacheControl = baseHeaders["Cache-Control"];
  try {
    payload = await pullOgRenderer.render(token, results);
  } catch (error) {
    console.error("Pull OG rendering failed", error);
    payload = await readFile(STATIC_OG_PATH);
    cacheControl = "public, max-age=300";
  }
  response.writeHead(200, {
    ...baseHeaders,
    "Cache-Control": cacheControl,
    "Content-Length": payload.byteLength,
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

async function handleRequest(request, response, runtimeConfig) {
  applyCommonHeaders(response, runtimeConfig);
  const method = request.method || "GET";
  if (method !== "GET" && method !== "HEAD") {
    response.setHeader("Allow", "GET, HEAD");
    sendText(response, 405, "Method not allowed\n", method);
    return;
  }

  const url = new URL(request.url || "/", "http://localhost");
  if (url.pathname === PULL_OG_PATH) {
    await sendPullOg(request, response, method, url);
    return;
  }
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

  if (filePath === INDEX_PATH) {
    await sendIndex(request, response, method, runtimeConfig);
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

function normalizePublicOrigin(value) {
  if (!value) return "";
  let parsed;
  try {
    parsed = new URL(String(value));
  } catch {
    throw new Error("Invalid PUBLIC_ORIGIN configuration");
  }
  if (
    !["http:", "https:"].includes(parsed.protocol)
    || parsed.username
    || parsed.password
    || parsed.pathname !== "/"
    || parsed.search
    || parsed.hash
  ) {
    throw new Error("Invalid PUBLIC_ORIGIN configuration");
  }
  return parsed.origin;
}

export function createAppServer(options = {}) {
  const publicOrigin = normalizePublicOrigin(
    Object.hasOwn(options, "publicOrigin") ? options.publicOrigin : process.env.PUBLIC_ORIGIN,
  );
  const nodeEnvironment = String(
    Object.hasOwn(options, "nodeEnv") ? options.nodeEnv : process.env.NODE_ENV || "",
  ).toLowerCase();
  if (nodeEnvironment === "production" && !publicOrigin) {
    throw new Error("PUBLIC_ORIGIN is required when NODE_ENV=production");
  }
  const runtimeConfig = Object.freeze({
    gaMeasurementId: normalizeMeasurementId(
      Object.hasOwn(options, "gaMeasurementId") ? options.gaMeasurementId : process.env.GA_MEASUREMENT_ID,
    ),
    publicOrigin,
  });
  return createServer((request, response) => {
    handleRequest(request, response, runtimeConfig).catch(error => {
      console.error("Request failed", error);
      if (!response.headersSent) {
        applyCommonHeaders(response, runtimeConfig);
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
