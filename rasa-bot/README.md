# CDF Chatbot — Rasa Bot

A bilingual (Arabic + English) Rasa Open Source assistant. One mixed-language
NLU model understands both languages; replies are chosen per-language via a
`language` slot using Rasa's native conditional response variations — see
`domain.yml`. No custom Python actions are needed for this POC (language
switching and the live-agent handoff signal are both fully declarative), so
there's no separate actions server to run.

## One-time setup

Requires Python **3.10** specifically (Rasa Open Source doesn't support 3.11+).
If your machine's default `python` is a different version, use the `py`
launcher to target 3.10 explicitly, as below.

```powershell
cd rasa-bot
py -3.10 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

This installs Rasa 3.6.21 and its dependencies (including TensorFlow) — it's
a large download and can take several minutes.

Also set this once per terminal session (Windows' default console encoding
can't print some characters Rasa's CLI output uses, e.g. in success/error
banners, and will crash the process otherwise):

```powershell
$env:PYTHONUTF8 = "1"
```

## Train the model

```powershell
.\.venv\Scripts\Activate.ps1
rasa train
```

## Run the server

```powershell
.\.venv\Scripts\Activate.ps1
rasa run --enable-api --cors "*" --credentials credentials.yml --endpoints endpoints.yml
```

This starts the assistant on `http://localhost:5005`, with the REST channel
at `POST /webhooks/rest/webhook` — this is what `website/js/chat-widget.js`
talks to. `--cors "*"` allows the static website (served from a different
local port) to call it; narrow this to your dev server's exact origin for
anything beyond local demoing.

## Quick manual test (no website needed)

```powershell
.\.venv\Scripts\Activate.ps1
rasa shell
```

Try both languages, e.g.:
- `hello` / `مرحبا`
- `I want to talk to a human` / `أريد التحدث مع موظف`

## Project layout

- `domain.yml` — intents, the `language` slot, and all bot responses (each
  with Arabic/English variants selected by the slot).
- `config.yml` — the bilingual NLU pipeline + dialogue policies.
- `data/nlu.yml` — training examples, mixed Arabic + English per intent.
- `data/stories.yml`, `data/rules.yml` — dialogue flows. Rules cover every
  intent here since this POC is single-turn Q&A + handoff, not multi-step
  forms; stories exist mainly to give the TED policies some data to train on.
- `credentials.yml` — enables the `rest` channel only.
- `endpoints.yml` — intentionally has no `action_endpoint` (see above).
