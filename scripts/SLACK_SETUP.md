# Slack Quick Bill — local dev in Cursor

## 1. Backend running

```bash
npm run dev -w backend
```

You should see either:
- `[slack] Bill, stock, and raw material bots enabled at POST /api/slack/events` — ready
- `[slack] Bots disabled` — add env vars (step 4)

## 2. Public tunnel (Slack needs HTTPS)

```bash
npm run slack:dev
```

Copy the **Request URL** it prints (ngrok → `/api/slack/events`).

> ngrok URL changes each free session. Re-paste in Slack app settings when it changes, or update `scripts/telly-slack-manifest.json`.

## 3. Create Slack app

1. Open [api.slack.com/apps](https://api.slack.com/apps) and sign in
2. **Create New App** → **From a manifest**
3. Pick your workspace
4. Paste contents of `scripts/telly-slack-manifest.json` (update URLs if ngrok changed)
5. **Create**

## 4. Add secrets to `backend/.env`

```bash
SLACK_BOT_TOKEN=xoxb-...          # OAuth → Bot User OAuth Token
SLACK_SIGNING_SECRET=...          # Basic Information → Signing Secret
SLACK_ALLOWED_USER_IDS=U...       # Your profile → ⋮ → Copy member ID
FRONTEND_URL=https://tallypns.pages.dev
```

Restart backend after saving `.env`.

## 5. Install & test

1. Slack app → **Install to Workspace**
2. In Slack:
   - `/bill` — sales invoice
   - `/stock` — inventory adjustment (product → size → increase/decrease → qty)
   - `/rawmat` — raw material supplier bill
3. Follow the DM wizard → record created in Telly

## Production (Render)

Replace ngrok URLs with:

`https://tallypns-api.onrender.com/api/slack/events`

Add the same env vars in Render dashboard.
