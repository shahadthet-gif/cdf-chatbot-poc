# CDF Chatbot POC

A proof-of-concept demonstrating: a website that visually mimics the
Cultural Development Fund site, a bilingual (Arabic/English) Rasa chatbot
embedded in it, and reliable handoff to a live human agent whenever a user
asks for one — rendered as one unified chat panel, not a swap to a
separate widget.

## Pieces

| Folder | What it is | Details |
|---|---|---|
| [`website/`](website/) | Static site + custom chat widget | [`website/README.md`](website/README.md) |
| [`rasa-bot/`](rasa-bot/) | Bilingual Rasa Open Source assistant | [`rasa-bot/README.md`](rasa-bot/README.md) |
| [`chatwoot-proxy/`](chatwoot-proxy/) | Bridges our chat UI to Chatwoot's official API | [`chatwoot-proxy/README.md`](chatwoot-proxy/README.md) |
| [`docs/SETUP.md`](docs/SETUP.md) | Chatwoot Cloud account setup notes | — |
| [`docs/SHARING.md`](docs/SHARING.md) | Getting a temporary public link to demo this to others | — |

## Running the full demo

**Three processes**, all local:

1. **Rasa server** (terminal 1):
   ```powershell
   cd rasa-bot
   .\.venv\Scripts\Activate.ps1
   $env:PYTHONUTF8 = "1"
   rasa run --enable-api --cors "*" --credentials credentials.yml --endpoints endpoints.yml
   ```
2. **Live-chat proxy** (terminal 2):
   ```powershell
   cd chatwoot-proxy
   node server.js
   ```
3. **Website** (terminal 3):
   ```powershell
   cd website
   py -3.14 serve.py 5500
   ```
4. Open **http://localhost:5500** in your browser.

Chatwoot Cloud is already configured (see `chatwoot-proxy/README.md` for
the account details baked in, and `website/js/chatwoot-integration.js` for
the fallback widget token) — no further setup needed to try the full flow.

## Try it

- Click the chat launcher (bottom-right, black rounded icon) — choose a
  language, ask about funding/investment/enablement services.
- Click "Contact Us" / "تواصل معنا" to see phone/email, or ask for a human
  directly in either language ("I want to talk to a human", "أريد التحدث
  مع موظف") — the assistant hands off to a live agent **inside the same
  panel** (agent replies show up as normal bubbles). If the live-chat proxy
  isn't running, it automatically falls back to Chatwoot's own widget
  instead of breaking.
- Toggle the site language via the "English"/"العربية" button in the header.
- To reply as the agent during a demo: log into
  **https://app.chatwoot.com**, open the conversation (it'll be in the
  "CDF Custom Chat Backend" inbox), and reply from there — your reply
  shows up in the website's chat panel within ~3 seconds (polling, not
  push — see `chatwoot-proxy/README.md` for why).

## Why these choices

Full rationale is in the original plan file and in the code comments at
each pivot point, but in short: Rasa Open Source 3.6.21 is the newest
version compatible with this machine (no admin rights, so we use the
Python 3.10 already installed via the `py` launcher); Arabic + English are
trained together in one NLU model rather than two separate pipelines; and
live-agent handoff renders inside our own custom panel via a small
server-side proxy talking to Chatwoot's official Application API — chosen
after confirming Chatwoot's public "Client API" doesn't work on Cloud
(404) and that reverse-engineering their internal widget API would be too
fragile for something this important. The proxy exists solely to keep the
Chatwoot agent API token off the browser; if it's ever unreachable, the
site falls back to Chatwoot's own embedded widget rather than breaking.

## Not in scope for this POC

Real CDF business services/backend logic, full parity with every page of the
real site, and any deployment beyond localhost — the goal is demonstrating
the look-and-feel plus a reliable chatbot → human handoff, not rebuilding
the Fund's actual services.
