# Push notifications (PWA)

**Frontend:** `frontend/src/features/notifications/`, `frontend/public/push-sw.js`  
**Backend:** `backend/src/modules/notifications/`  
**API:** `/api/notifications/*` · **DB:** `PushSubscription`

Web push for payment reminders and selected operational events. Requires VAPID keys on the server (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`).

## Opt-in (per device)

- First visit: dialog to **Allow notifications** (browser requires a tap).
- Desktop: top bar **bell** → **Send test** / status.
- Phone: **account** menu → Payment reminders.
- iPhone/iPad: add **PNS ERP** to Home Screen and open from there; Safari tabs alone do not get web push.

Subscriptions are stored per device (`PushSubscription`); multiple devices per user are supported.

## Payment reminders

- **11:00 AM IST** daily (GitHub Actions → `POST /api/notifications/cron`) when there are overdue invoices or invoices due within 7 days (customers with payment terms).
- Skips send when nothing to remind; at most one payment reminder push per device per IST day (unless cron `force=1`).
- Optional **2:00 PM IST** test broadcast workflow hits `POST /api/notifications/cron/test-broadcast` (all subscribed devices).

## Operational pushes

When `notifyDevices: true` is set on an activity log write, the server pushes the activity **summary** to **all** subscribed devices (standard notification sound, no money clip). Tap opens the related `href`.

| Module | Events that push |
|--------|------------------|
| **Sales** | Invoice **created** (app or Slack) |
| **Purchase** | Bill **created** or **updated** |
| **Raw material** | Bill **created** or **updated** (app or Slack create) |
| **Inventory** | Stock **adjustment** |

Other activity (payments, deletes, etc.) is logged only — no push.

Failed push delivery never blocks saving bills or stock.

## Sound

- Payment reminders may include custom sound on Android/desktop when the app is open; iOS uses the system notification tone and does not play in-app MP3 on push (avoids lock-screen media controls).
- Operational alerts use the **system notification sound** (`silent: false`, no custom MP3).

See also [activity.md](./activity.md) for the in-app feed.
