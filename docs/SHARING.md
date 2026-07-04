# Sharing a Temporary Demo Link

The site normally only runs on `localhost`, which nobody outside this
laptop can reach. This doc covers making it reachable temporarily, e.g. to
send someone a link. It is **not** a permanent deployment — see the
"Not doing this" note at the bottom for why, and what real hosting would
involve instead.

Easiest: in a Claude Code session, just ask **"set up a shareable demo
link"** and this whole process gets done for you. Below is what that
actually does, in case you want to run it yourself or understand it.

## Steps

1. **Start the three local servers** (see root `README.md` for exact
   commands): Rasa on port 5005, the live-chat proxy on port 5600, the
   website on port 5500.

2. **Start a tunnel for each port**, using the Cloudflare quick-tunnel
   binary already saved at `tools/cloudflared.exe` (no install, no
   account needed):
   ```powershell
   .\tools\cloudflared.exe tunnel --url http://localhost:5005   # Rasa
   .\tools\cloudflared.exe tunnel --url http://localhost:5600   # proxy
   .\tools\cloudflared.exe tunnel --url http://localhost:5500   # website
   ```
   Each prints a random `https://*.trycloudflare.com` URL — **a new one
   every time**, there's no way to keep the same link across runs without
   a paid/authenticated Cloudflare tunnel.

3. **Point the code at the new tunnel URLs** — three places, all marked
   with a `🔴 TEMPORARY` comment:
   - `website/js/chat-widget.js` → `RASA_URL` = the Rasa tunnel URL + `/webhooks/rest/webhook`
   - `website/js/chatwoot-integration.js` → `PROXY_BASE_URL` = the proxy tunnel URL
   - `chatwoot-proxy/server.js` → `ALLOWED_ORIGIN` = the website tunnel URL

4. **Restart the proxy** (only the proxy — the website server picks up JS
   edits automatically since it disables caching, and Rasa doesn't need
   the domain retrained for this, only the running server needs to still
   be up) so its CORS setting takes effect.

5. Share the **website** tunnel URL. That's the one people actually open.

## Known limitation

Cloudflare's free "quick tunnel" is explicitly a lightweight/best-effort
service — under this page's burst of ~20 concurrent asset requests (CSS,
JS, several images) on first load, it occasionally drops one and shows a
502 for a single icon/image. A page refresh always fixes it. This isn't
a bug in the site (verified: zero errors when tested directly on
`localhost`, no tunnel involved) — it's a tradeoff of the free tunnel
tier. Mention this to whoever you send the link to, just in case.

## When you're done sharing

Ask to revert the three `🔴 TEMPORARY` values back to `localhost` for
normal local development, and the tunnels can be shut down.

## Not doing this: permanent hosting

A real "always-on, works from anywhere, proper domain" version would mean
actually deploying each piece to cloud hosting (a static host for the
website, a server with enough resources for Rasa's TensorFlow model, and
somewhere to run the small proxy) — real accounts, real (if often free-
tier) hosting setup, and ongoing things to maintain. That's a legitimate
next phase if this POC turns into something that needs to stay up
permanently, but it's a meaningfully bigger scope than what's built here —
worth a separate conversation if/when that's actually needed.
