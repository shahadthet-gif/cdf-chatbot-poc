/**
 * CDF live-chat proxy.
 *
 * Bridges the website's custom chat UI to Chatwoot's official, documented
 * Application API (https://developers.chatwoot.com/api-reference) so agent
 * replies render as plain bubbles inside our own black/white panel instead
 * of Chatwoot's separate widget UI.
 *
 * This exists ONLY because CHATWOOT_API_TOKEN grants full read/write access
 * to the whole Chatwoot account — it must never be sent to a browser, so all
 * Chatwoot calls happen server-side, here, and the frontend only ever talks
 * to this proxy's small, unprivileged endpoints.
 *
 * All config comes from environment variables (see .env.example) rather
 * than being hardcoded, so the real secret never has to touch git history.
 * For local dev, values are read from a .env file next to this script if
 * present (gitignored — see chatwoot-proxy/README.md to set yours up).
 *
 * No npm dependencies — plain Node (built-in http module + global fetch),
 * including the tiny .env parser below, so `node server.js` is all that's
 * needed either locally or on a host like Render.
 */
"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");

(function loadDotEnv() {
  try {
    const content = fs.readFileSync(path.join(__dirname, ".env"), "utf8");
    content.split("\n").forEach((line) => {
      const match = /^\s*([^#=\s][^=]*?)\s*=\s*(.*)\s*$/.exec(line);
      if (match && !(match[1] in process.env)) {
        process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
      }
    });
  } catch (e) {
    // No .env file — fine when real environment variables are set instead
    // (e.g. in Render's dashboard).
  }
})();

const CHATWOOT_ACCOUNT_ID = process.env.CHATWOOT_ACCOUNT_ID;
const CHATWOOT_API_TOKEN = process.env.CHATWOOT_API_TOKEN;

// The "CDF Custom Chat Backend" inbox — a Channel::Api inbox created
// specifically for this integration. Kept separate from the "CDF Website"
// Website-Widget inbox, which stays around only as the fallback path (see
// website/js/chatwoot-integration.js) if this proxy is ever unreachable.
const CHATWOOT_INBOX_ID = process.env.CHATWOOT_INBOX_ID;

if (!CHATWOOT_ACCOUNT_ID || !CHATWOOT_API_TOKEN || !CHATWOOT_INBOX_ID) {
  console.error(
    "Missing required env vars: CHATWOOT_ACCOUNT_ID, CHATWOOT_API_TOKEN, CHATWOOT_INBOX_ID.\n" +
      "Copy .env.example to .env and fill in real values for local dev, or set them in Render's dashboard."
  );
  process.exit(1);
}

const CHATWOOT_BASE = `https://app.chatwoot.com/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}`;
const PORT = process.env.PORT || 5600;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "http://localhost:5500";

// sessionId (the same id the website already uses for Rasa) -> Chatwoot ids
const sessions = new Map();

async function chatwootFetch(path, options) {
  const res = await fetch(CHATWOOT_BASE + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      api_access_token: CHATWOOT_API_TOKEN,
      ...(options && options.headers)
    }
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch (e) {
    json = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(`Chatwoot API ${path} -> ${res.status}: ${text}`);
    err.status = res.status;
    throw err;
  }
  return json;
}

async function ensureSession(sessionId) {
  const existing = sessions.get(sessionId);
  if (existing) return existing;

  const contactRes = await chatwootFetch("/contacts", {
    method: "POST",
    body: JSON.stringify({
      inbox_id: CHATWOOT_INBOX_ID,
      name: "Website visitor " + sessionId.slice(-6)
    })
  });
  const contactId = contactRes.payload.contact.id;

  const conversation = await chatwootFetch("/conversations", {
    method: "POST",
    body: JSON.stringify({
      source_id: "cdf-" + sessionId,
      inbox_id: CHATWOOT_INBOX_ID,
      contact_id: contactId,
      status: "open"
    })
  });

  const session = { contactId, conversationId: conversation.id };
  sessions.set(sessionId, session);
  return session;
}

function sendJson(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  res.end(JSON.stringify(body));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    });
    return res.end();
  }

  const url = new URL(req.url, "http://localhost");

  try {
    if (req.method === "POST" && url.pathname === "/api/handoff/start") {
      const { sessionId } = await readJsonBody(req);
      if (!sessionId) return sendJson(res, 400, { error: "sessionId required" });
      const session = await ensureSession(sessionId);
      return sendJson(res, 200, { conversationId: session.conversationId });
    }

    if (req.method === "POST" && url.pathname === "/api/handoff/message") {
      const { sessionId, text } = await readJsonBody(req);
      if (!sessionId || !text) return sendJson(res, 400, { error: "sessionId and text required" });
      const session = await ensureSession(sessionId);
      const message = await chatwootFetch(`/conversations/${session.conversationId}/messages`, {
        method: "POST",
        body: JSON.stringify({ content: text, message_type: "incoming" })
      });
      return sendJson(res, 200, { id: message.id });
    }

    if (req.method === "GET" && url.pathname === "/api/handoff/messages") {
      const sessionId = url.searchParams.get("sessionId");
      const afterId = Number(url.searchParams.get("afterId") || 0);
      if (!sessionId) return sendJson(res, 400, { error: "sessionId required" });
      const session = sessions.get(sessionId);
      if (!session) return sendJson(res, 200, { messages: [] });

      const data = await chatwootFetch(`/conversations/${session.conversationId}/messages`);
      const messages = (data.payload || [])
        .filter((m) => m.message_type === 1 && m.sender && m.sender.type === "user" && m.id > afterId)
        .map((m) => ({
          id: m.id,
          content: m.content,
          senderName: m.sender.available_name || m.sender.name || ""
        }));
      return sendJson(res, 200, { messages });
    }

    if (req.method === "GET" && url.pathname === "/api/health") {
      return sendJson(res, 200, { ok: true });
    }

    sendJson(res, 404, { error: "not found" });
  } catch (err) {
    console.error(err);
    sendJson(res, 500, { error: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`CDF live-chat proxy running at http://localhost:${PORT}`);
});
