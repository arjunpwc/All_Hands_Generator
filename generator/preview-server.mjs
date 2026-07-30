/**
 * Local preview server — always serves preview.html from disk (no stale in-memory cache).
 * Usage: node generator/preview-server.mjs [session-id] [port] [--open]
 */

import fs from "fs";
import http from "http";
import path from "path";
import { spawn, execFileSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const DEFAULT_PORT = 8825;
const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const openBrowser = process.argv.includes("--open");
const sessionId = args[0] || "oracle-fy27";
const port = Number(args[1] || DEFAULT_PORT);
const host = "127.0.0.1";

const sessionDir = path.join(REPO_ROOT, "data", "sessions", sessionId);
const sessionPath = path.join(sessionDir, "session.json");
const previewPath = path.join(sessionDir, "preview.html");
const previewInfoPath = path.join(sessionDir, ".preview-url");

if (!fs.existsSync(sessionPath)) {
  console.error(`Session not found: ${sessionDir}`);
  process.exit(1);
}

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

const NO_CACHE = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

function regeneratePreview() {
  execFileSync(process.execPath, ["generator/write-preview.mjs", sessionId], {
    cwd: REPO_ROOT,
    stdio: "pipe",
  });
}

function readPreviewHtml() {
  if (!fs.existsSync(previewPath)) {
    regeneratePreview();
  }
  return fs.readFileSync(previewPath, "utf8");
}

function previewBuildTime(html) {
  const match = html.match(/data-built-at="([^"]+)"/);
  return match ? match[1] : "unknown";
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", `http://${host}:${port}`);

  if (url.pathname === "/" || url.pathname === "/index.html" || url.pathname === "/preview.html") {
    try {
      const html = readPreviewHtml();
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", ...NO_CACHE });
      res.end(html);
    } catch (err) {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(`Preview generation failed: ${err.message}`);
    }
    return;
  }

  if (url.pathname === "/reload") {
    try {
      regeneratePreview();
      const html = readPreviewHtml();
      res.writeHead(200, { "Content-Type": "application/json", ...NO_CACHE });
      res.end(JSON.stringify({ ok: true, builtAt: previewBuildTime(html) }));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: err.message }));
    }
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
    res.writeHead(200, {
      "Content-Type": mime[ext] || "application/octet-stream",
      ...NO_CACHE,
    });
    res.end(fs.readFileSync(filePath));
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${port} is in use.`);
    console.error(`Run: .\\preview-oracle-fy27.ps1  (stops old server and restarts)`);
  } else {
    console.error(err);
  }
  process.exit(1);
});

server.listen(port, host, () => {
  try {
    regeneratePreview();
  } catch (err) {
    console.error(`Warning: could not regenerate preview on startup: ${err.message}`);
  }

  const url = `http://${host}:${port}`;
  const html = fs.existsSync(previewPath) ? readPreviewHtml() : "";
  const builtAt = previewBuildTime(html);

  fs.writeFileSync(
    previewInfoPath,
    JSON.stringify({ url, port, sessionId, builtAt, startedAt: new Date().toISOString() }, null, 2)
  );

  console.log(`Session: ${sessionId}`);
  console.log(`Preview URL:  ${url}`);
  console.log(`Built at:     ${builtAt}`);
  console.log(`Reload API:   ${url}/reload`);
  console.log(`Offline file: ${previewPath}`);
  console.log(`\nAfter code changes, run: node generator/write-preview.mjs ${sessionId}`);
  console.log(`Then refresh the browser (F5).`);

  if (openBrowser) {
    const openUrl = `${url}?v=${Date.now()}`;
    const cmd = process.platform === "win32" ? "cmd" : "xdg-open";
    const cmdArgs = process.platform === "win32" ? ["/c", "start", "", openUrl] : [openUrl];
    spawn(cmd, cmdArgs, { detached: true, stdio: "ignore" }).unref();
  }
});
