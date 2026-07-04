# CDF Chatbot — Website

A static website replicating the look and feel of the Cultural Development
Fund site (cdf.gov.sa): black/white palette, RTL Arabic by default with an
English toggle, and a custom chat widget in the bottom-right corner wired to
the local Rasa server.

## Run it

No build step — plain HTML/CSS/JS. Use `serve.py` (not plain
`http.server`) — it disables browser caching, which matters while this is
under active development: a plain static server lets browsers cache JS
files indefinitely, so an edit can silently keep serving the old version
even after a refresh.

```powershell
cd website
py -3.14 serve.py 5500
```

Then open **http://localhost:5500** in your browser. If you ever suspect
you're seeing stale behavior, hard-refresh (Ctrl+Shift+R) once to be safe.

## Requirements for the chat widget to work

1. The Rasa server must be running locally on port 5005 — see
   `../rasa-bot/README.md`.
2. For live-agent handoff to render inside this same panel, the proxy in
   `../chatwoot-proxy/` must be running on port 5600 — see
   `../chatwoot-proxy/README.md`. If it's not running, handoff automatically
   falls back to opening Chatwoot's own embedded widget instead of failing.

## File layout

- `index.html` — page structure and content (bilingual via `data-i18n` attrs).
- `css/main.css` — site-wide styling.
- `css/chat-widget.css` — chat launcher/panel styling.
- `js/main.js` — language toggle for the site chrome, hero dot rotation,
  accessibility button.
- `js/chat-widget.js` — the custom chat UI: renders messages/buttons, talks
  to the Rasa REST channel, and triggers handoff (via a
  `custom.action === "handoff_to_chatwoot"` payload from Rasa).
- `js/chatwoot-integration.js` — two-tier live-chat client: talks to
  `chatwoot-proxy` first (agent replies render as bubbles right here, no
  separate UI), falling back to loading Chatwoot's own widget script
  (hidden by default, toggled open via `window.cdfTriggerHandoff()`) only
  if the proxy is unreachable.
- `assets/images/`, `assets/icons/` — logo, photos, and art-category icons.
