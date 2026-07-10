/**
 * Lightweight local server to preview generated sessions (no Python/npm required).
 * Usage: node generator/preview-server.mjs [session-id] [port]
 */

import fs from "fs";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { buildViewerHtml } from "./viewer-template.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const sessionId = process.argv[2] || "oracle-fy27";
const port = Number(process.argv[3] || 8765);
const host = "127.0.0.1";

const sessionDir = path.join(REPO_ROOT, "data", "sessions", sessionId);
const sessionPath = path.join(sessionDir, "session.json");
const metaPath = path.join(sessionDir, "meta.json");

if (!fs.existsSync(sessionPath)) {
  console.error(`Session not found: ${sessionDir}`);
  process.exit(1);
}

const session = JSON.parse(fs.readFileSync(sessionPath, "utf8"));
const meta = fs.existsSync(metaPath) ? JSON.parse(fs.readFileSync(metaPath, "utf8")) : {};

const mime = {
  ".html": "text/html; charset=utf-8",
  ".json": "application/json",
  ".css": "text/css",
  ".js": "application/javascript",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

const viewerHtml = buildViewerHtml(session, sessionId, {
  assetPrefix: "/assets/",
  standalone: false,
});

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", `http://${host}:${port}`);

  if (url.pathname === "/" || url.pathname === "/index.html") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(viewerHtml);
    return;
  }

  if (url.pathname === `/api/sessions/${sessionId}`) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ...meta, ...session }));
    return;
  }

  if (url.pathname.startsWith("/assets/")) {
    const rel = decodeURIComponent(url.pathname.slice("/assets/".length));
    const filePath = path.join(sessionDir, "assets", rel);
    const assetsRoot = path.join(sessionDir, "assets");
    if (!filePath.startsWith(assetsRoot) || !fs.existsSync(filePath)) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": mime[ext] || "application/octet-stream" });
    res.end(fs.readFileSync(filePath));
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${port} is in use. Try: node generator/preview-server.mjs ${sessionId} ${port + 1}`);
  } else {
    console.error(err);
  }
  process.exit(1);
});

server.listen(port, host, () => {
  console.log(`Session: ${session.title} (${session.slide_count} slides)`);
  console.log(`Open in browser: http://${host}:${port}`);
  console.log(`Offline file:     ${path.join(sessionDir, "preview.html")}`);
});
