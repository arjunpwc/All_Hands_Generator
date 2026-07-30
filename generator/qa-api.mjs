import fs from "fs";
import path from "path";
import { randomBytes } from "crypto";

export function qaFilePath(sessionDir) {
  return path.join(sessionDir, "qa.json");
}

export function readQuestions(sessionDir) {
  const filePath = qaFilePath(sessionDir);
  if (!fs.existsSync(filePath)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function writeQuestions(sessionDir, questions) {
  const filePath = qaFilePath(sessionDir);
  fs.mkdirSync(sessionDir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(questions, null, 2));
}

export function addQuestion(sessionDir, name, text) {
  const cleaned = String(text || "").trim();
  if (!cleaned) {
    throw new Error("Question text is required");
  }

  const displayName = String(name || "Anonymous").trim() || "Anonymous";
  const question = {
    id: randomBytes(4).toString("hex"),
    name: displayName,
    text: cleaned,
    time: new Date().toISOString(),
  };

  const questions = readQuestions(sessionDir);
  questions.unshift(question);
  writeQuestions(sessionDir, questions);
  return question;
}

export function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

export function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...corsHeaders(),
  });
  res.end(JSON.stringify(payload));
}

export function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export function handleQaRequest(req, res, sessionDir, sessionId) {
  const prefix = `/api/sessions/${sessionId}/questions`;
  const url = new URL(req.url || "/", "http://localhost");

  if (url.pathname !== prefix) return false;

  if (req.method === "OPTIONS") {
    res.writeHead(204, corsHeaders());
    res.end();
    return true;
  }

  if (req.method === "GET") {
    sendJson(res, 200, readQuestions(sessionDir));
    return true;
  }

  if (req.method === "POST") {
    readJsonBody(req)
      .then((body) => {
        const name = body.name || body.author || "Anonymous";
        const question = addQuestion(sessionDir, name, body.text);
        sendJson(res, 201, question);
      })
      .catch((err) => {
        const message = err.message || "Invalid request";
        const status = message.includes("required") ? 400 : 400;
        sendJson(res, status, { detail: message });
      });
    return true;
  }

  sendJson(res, 405, { detail: "Method not allowed" });
  return true;
}
