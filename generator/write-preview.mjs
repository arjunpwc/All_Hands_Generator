/** Write preview.html for an existing session. */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { writeStandalonePreview } from "./viewer-template.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const sessionId = process.argv[2] || "oracle-july25";
const sessionDir = path.join(REPO_ROOT, "data", "sessions", sessionId);
const sessionPath = path.join(sessionDir, "session.json");

if (!fs.existsSync(sessionPath)) {
  console.error(`Session not found: ${sessionPath}`);
  process.exit(1);
}

const session = JSON.parse(fs.readFileSync(sessionPath, "utf8"));
const previewPath = writeStandalonePreview(session, sessionDir, sessionId);
console.log(`Wrote ${previewPath}`);
