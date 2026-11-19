# Collections: deployment notes (texts, email, scheduled job)

Everything on this page is **off by default**. Nothing here is needed for REVIEW mode,
where every text and email is saved as a "dry run" and nothing leaves the building.
Do these steps only when you're ready to send real texts (PILOT or LIVE mode), after the
Minnesota attorney review in `docs/COLLECTIONS_OPEN_QUESTIONS.md`.

## 0. Turning the module on (REVIEW)

On the live server, add this line to `deploy/docker/.env`, then run the Deploy Production
workflow again:

```env
COLLECTIONS_MODULE=REVIEW
```

Only the owner and General Manager will see Collections, and every text and email is a dry
run. The live database starts empty: import the DealerCenter Active Accounts file on
Collections → Import. Set the line back to `OFF` (or remove it) and deploy again to hide it.

## 1. The scheduled job

The Collections automations run after each import, and from the route
`/api/cron/collections`. That route is safe to call every 15 minutes, and it does nothing
while `COLLECTIONS_MODULE=OFF`. It needs the same `CRON_SECRET` as the app's other jobs.

Your Docker scheduler (`deploy/docker/scripts/run-production-scheduler.mjs`) now calls
`/api/cron/collections` every 15 minutes, along with the app's other jobs (added on the
`collections-dispatch-link` branch, at your request). While `COLLECTIONS_MODULE=OFF` the
route does nothing. When the module is on, it runs the daily automations once a day
(creating and closing the dispatch board tasks) and the import reminder. Texts and emails
still follow `COLLECTIONS_SMS_SENDING` / `COLLECTIONS_EMAIL_SENDING`, which stay `DRY_RUN`
until you switch them. If you deploy on Vercel instead, add the same route to `vercel.json`.

## 2. Texts (Twilio)

1. In Twilio, buy a local number (or use a Messaging Service), and finish A2P 10DLC
   registration for "account notifications / collections". Carriers block unregistered
   business texting.
2. In the server's `.env` (never in the code), fill in:
   - `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN`
   - `TWILIO_MESSAGING_SERVICE_SID`, or `TWILIO_FROM_NUMBER`
   - `COLLECTIONS_PUBLIC_WEBHOOK_BASE_URL`, the public https address from step 3, for
     example `https://texts.example.com`
3. Make **only** the two text webhooks reachable from the internet (see below).
4. In Twilio, under the number or Messaging Service, set:
   - "A message comes in" to `POST https://<public address>/api/collections/sms/inbound`
   - "Status callback" to `https://<public address>/api/collections/sms/status`. The app
     also sends this address with each message.
5. Opt-out replies: the app records STOP / START / HELP itself and sends one confirmation.
   Twilio also blocks numbers that text STOP, and by default it sends its own reply. To
   avoid two confirmations, turn off Twilio's default opt-out reply text, or leave it on and
   accept two.
6. Set `COLLECTIONS_SMS_SENDING=DRY_RUN` first. Watch the Inbox and the account timelines
   for a few days, then switch to `LIVE`. `LIVE` only works when
   `COLLECTIONS_MODULE=PILOT` or `LIVE`; REVIEW mode always forces a dry run.

### Exposing only the webhooks

The webhooks check Twilio's signature on every request. Anything not signed with your
`TWILIO_AUTH_TOKEN` is rejected (403), and requests are rate-limited. Even so, **don't
expose the rest of the app.** Use one of these:

**Option A: Caddy on a public domain (Docker deployment).** Add a separate site that
forwards only the two paths and refuses everything else:

```caddy
texts.example.com {
	@twilio path /api/collections/sms/inbound /api/collections/sms/status
	handle @twilio {
		reverse_proxy app:3000
	}
	handle {
		respond 404
	}
}
```

**Option B: Tailscale.** Your private Tailscale setup deliberately uses Serve, not Funnel,
so the app stays private. Funnel publishes to the whole internet, so never funnel the whole
app. If you use Funnel, point it at a small proxy (for example the Caddy block above,
listening on a local port) that only forwards the two webhook paths:

```bash
tailscale funnel --bg --set-path /api/collections/sms/ http://127.0.0.1:8099/api/collections/sms/
```

Here `127.0.0.1:8099` is a Caddy that only allows the two paths. Check with
`tailscale funnel status` that nothing else is published.

**Check it:** from a phone that isn't on Tailscale:
- `https://<public address>/` should **not** show the app;
- `https://<public address>/api/collections/sms/inbound` should answer `403` (unsigned
  request).

## 3. Email (Resend)

Collections email reuses the app's Resend key:
- `RESEND_API_KEY` is the same key as staff emails.
- `COLLECTIONS_EMAIL_FROM` is a sender on a domain verified in Resend.
- `COLLECTIONS_EMAIL_REPLY_TO` is where customer replies go. Customer email replies don't
  come into the Inbox in Release 1.
- Start with `COLLECTIONS_EMAIL_SENDING=DRY_RUN`, then `LIVE`.

## 4. What's logged

Phone numbers are masked in server logs (`***-***-1234`). Message text is never written to
the logs or the board's activity feed. It stays in the database, visible on the account and
in the Inbox.
