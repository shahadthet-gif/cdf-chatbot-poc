# Chatwoot Cloud Setup

Your Chatwoot Cloud account is already set up and wired in — nothing left
to do to try the demo. This doc is a record of what exists and where, plus
one optional dashboard tweak for the fallback path.

## What's configured

Two inboxes exist in your Chatwoot account (id `173274`):

1. **"CDF Website"** (Website-Widget channel, id `118434`, token in
   `website/js/chatwoot-integration.js` as `CHATWOOT_WEBSITE_TOKEN`) — used
   only as the **fallback** if `chatwoot-proxy` isn't running. Handoff
   normally never reaches this; see below.
2. **"CDF Custom Chat Backend"** (API channel, id `118582`) — used by
   `chatwoot-proxy/server.js`, which is what actually powers the unified
   chat experience day to day. See `chatwoot-proxy/README.md` for how it
   works and where the account credentials live.

**Why two inboxes:** Chatwoot only allows the Application API to simulate
an "incoming" (visitor) message on an API-type inbox, not a Website-Widget
inbox — a Website-Widget inbox rejects that with a 422. So the primary
unified-chat path needed its own dedicated inbox; the original Website
inbox stuck around as the safety-net fallback.

**When you're replying as the agent**, conversations from the normal
(unified) flow land in **"CDF Custom Chat Backend"**, not "CDF Website" —
check there first.

## Fallback widget theming — already done

If `chatwoot-proxy` is ever down, handoff falls back to the embedded
Chatwoot widget, which renders in a cross-origin iframe (CSS from our page
can't reach inside it — a fixed browser security boundary, not something
to work around). Two things were already set via the Application API so
the fallback looks and behaves reasonably:

- Widget color set to black (`#0a0a0a`) to loosely match the site.
- `enable_email_collect` turned off on the "CDF Website" inbox — this was
  the actual cause of the "leave your email" prompt seen during testing
  (not the Pre-Chat Form or Business Hours, which were red herrings).

## If you ever need to redo this from scratch

1. Sign up at **https://app.chatwoot.com/app/signup** (free tier: 2 agent
   seats, 500 conversations/month, 30-day retention — enough for a demo).
2. **Website inbox** (fallback): Inboxes → Add Inbox → Website → copy the
   `websiteToken` from the generated embed snippet into
   `website/js/chatwoot-integration.js`.
3. **API inbox** (primary): Inboxes → Add Inbox → **API** → note its inbox
   id (visible in the inbox's settings URL) → put it in
   `chatwoot-proxy/server.js` as `CHATWOOT_INBOX_ID`.
4. **Access token**: profile avatar → Profile Settings → Access Token →
   put it in `chatwoot-proxy/server.js` as `CHATWOOT_API_TOKEN`. This
   grants full account access — keep `server.js` private, never send it to
   a browser or commit it to a shared repo.
5. **Account id**: the number in your dashboard URL
   (`.../app/accounts/<this>/dashboard`) → `CHATWOOT_ACCOUNT_ID` in the
   same file.
