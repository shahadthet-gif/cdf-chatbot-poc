# CDF Live-Chat Proxy

A small, dependency-free Node server that bridges the website's custom chat
UI to Chatwoot's official **Application API**, so a human agent's replies
render as normal message bubbles inside our own black/white chat panel —
no separate Chatwoot widget UI is shown to the visitor.

## Why this exists

Chatwoot's Application API (`/api/v1/accounts/{id}/...`) is the correct,
documented way to manage conversations programmatically, but it requires an
**agent API access token** that grants full read/write access to the whole
Chatwoot account. That token can never be sent to a browser — anyone could
view-source it. So this proxy is the only thing that ever talks to Chatwoot
directly; the website only ever talks to this proxy's three small,
unprivileged endpoints.

If this proxy isn't running (or a request to it fails for any reason), the
website automatically falls back to Chatwoot's own embedded widget instead
of breaking — see `website/js/chatwoot-integration.js`.

## Run it

No install step — plain Node, no dependencies.

```powershell
cd chatwoot-proxy
node server.js
```

Runs on `http://localhost:5600`. Needs to be running alongside the Rasa
server and the website's static server for live-agent handoff to render
in the unified panel (see root `README.md` for the full run order).

## Configuration

Config comes from environment variables (never hardcoded in `server.js`,
so the secret token never touches git history). For local dev, copy
`.env.example` to `.env` and fill in real values — `.env` is gitignored,
and the server loads it automatically on startup if present. In production
(e.g. Render), set these as real environment variables in the dashboard
instead of a `.env` file.

- `CHATWOOT_ACCOUNT_ID` — your Chatwoot account id.
- `CHATWOOT_API_TOKEN` — 🔴 **secret**. An agent's personal access token
  (Chatwoot dashboard → profile avatar → Profile Settings → Access Token).
  This grants full account access — never commit it, never send it
  anywhere other than `https://app.chatwoot.com`.
- `CHATWOOT_INBOX_ID` — the id of a dedicated **API-channel** inbox
  (Settings → Inboxes → Add Inbox → **API**, not Website). This has to be
  an API-type inbox specifically — Chatwoot only allows creating simulated
  "incoming" (visitor) messages via this API on that channel type; a
  Website-Widget inbox rejects them with a 422.
- `ALLOWED_ORIGIN` — the website's origin, for CORS. Defaults to
  `http://localhost:5500`.
- `PORT` — defaults to `5600` locally; Render sets this automatically in
  production.

## What it does

Three endpoints, matching the three things the frontend needs:

- `POST /api/handoff/start` `{ sessionId }` — creates (or reuses) a
  Chatwoot contact + conversation for this browser session and remembers
  the mapping in memory.
- `POST /api/handoff/message` `{ sessionId, text }` — posts the visitor's
  typed message into that conversation as an incoming message.
- `GET /api/handoff/messages?sessionId=...&afterId=N` — returns any new
  **agent** replies (filters out anything that isn't a real human agent
  message) since message id `N`. The frontend polls this every 3 seconds.

Real-time push (via Chatwoot's ActionCable websocket or webhooks) would
remove the polling delay, but both need a publicly reachable URL, which
`localhost` doesn't have — polling is the practical choice for local
development. Swap it for a webhook-driven push if this is ever deployed
somewhere with a public URL.

## Session storage

Sessions live in an in-memory `Map`, keyed by a session id the website
generates fresh **on every page load** specifically for this handoff flow
(`chatwootSessionId` in `chat-widget.js` — deliberately separate from, and
not persisted like, the Rasa `senderId`). That's intentional: reloading or
revisiting the site starts a brand-new Chatwoot conversation rather than
silently reattaching to (and replaying the full history of) whatever
conversation this browser had last time — a real bug caught during manual
testing. The conversation stays the *same* for as long as the tab stays
open, since `chatwootSessionId` only changes on a fresh page load.

Restarting this proxy also clears the map — anyone mid-conversation would
start a fresh Chatwoot conversation on their next message. Fine for a demo;
a real deployment would persist this (e.g. a small SQLite file) instead.
