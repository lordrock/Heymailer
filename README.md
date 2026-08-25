# RoundTable Email Marketing & Composer System

An internal dashboard for the RoundTable team to compose branded HTML emails, manage
reusable templates, personalise and send campaigns through Google SMTP, and track
delivery — built as a **standalone** app that shares your existing MongoDB cluster.

- **Backend:** Node.js / Express / MongoDB (Mongoose), JWT auth (single admin), Nodemailer + Google SMTP
- **Frontend:** Next.js 14 (App Router) / TypeScript-ready / Tailwind CSS
- **Queue:** In-app, MongoDB-backed batch sender (no Redis needed at RoundTable's volume — see note below)

Requires Node.js 20.9 or newer.

---

## 1. Project Structure

```
roundtable-email-system/
├── package.json        Root npm workspace and shared commands
├── backend/            Express API, MongoDB models, mailer, queue, seed templates
└── frontend/            Next.js 14 admin dashboard
```

Install all frontend, backend, and root tooling from the project root:

```bash
npm install
```

---

## 2. Backend Setup

```bash
cd backend
cp .env.example .env
```

Edit `.env`:

- **MONGODB_URI** — point this at your existing MongoDB Atlas cluster.
- **MONGODB_DB_NAME** — defaults to the dedicated `roundtable_mail` database. This app
  also explicitly prefixes every collection with `mail_`, so it cannot collide with
  collections belonging to the existing RoundTable project in the same cluster.
- **JWT_SECRET / UNSUBSCRIBE_SECRET** — set these to long random strings.
- **CLIENT_URL / SERVER_BASE_URL** — the public frontend and backend origins. In
  production both must use HTTPS. `SERVER_BASE_URL` is used for unsubscribe links.
- **COOKIE_SAME_SITE** — use `none` when frontend and backend are hosted on different
  domains; production cookies are secure-only. Use `lax` when both share one site.
- **ADMIN_EMAIL / ADMIN_PASSWORD** — used once by the seed script to create your single
  admin login. Change the password after first login isn't built in yet — rotate it by
  re-running the seed script against a new email, or updating the hash directly if you
  need to change it later.
- **SMTP_USER / SMTP_APP_PASSWORD** — a Gmail address with 2FA enabled, and an
  [App Password](https://myaccount.google.com/apppasswords) (16 characters, not your
  normal Gmail password). You can also set/override these later from **Settings** in
  the dashboard.
- **SMTP_CREDENTIALS_ENCRYPTION_KEY** — a separate random secret of at least 32
  characters used to encrypt dashboard-saved App Passwords with AES-256-GCM.
  `JWT_SECRET` is used as a fallback, but a dedicated key is recommended. Keep
  this value stable or previously encrypted credentials cannot be decrypted.
- **WEBSITE_URL / SAVINGS_URL / THRIFT_URL / TELEGRAM_URL / SUPPORT_EMAIL** — used to
  populate the `{{websiteUrl}}` etc. variables in emails. Also editable from Settings.

The backend automatically seeds the admin account, 4 starter templates, and default
contact groups when it starts. It is safe to run repeatedly. The admin password is
synchronised with `ADMIN_PASSWORD` in `.env`; other existing records are skipped. Set
`AUTO_SEED=false` to disable this behaviour.

You can also trigger the same seed process manually:

```bash
npm run seed
```

If `ADMIN_PASSWORD` is changed after the admin has already been created, apply the
new value to that account with:

```bash
npm run reset-admin-password
```

Start the API:

```bash
npm run dev      # nodemon, auto-restart
# or
npm start
```

The API runs on `http://localhost:5100` by default (`PORT` in `.env`).

---

## 3. Frontend Setup

```bash
cd frontend
cp .env.local.example .env.local
npm run dev
```

After creating both environment files, you can also run both applications from the
project root:

```bash
npm run dev
```

Runs on `http://localhost:3100`. Log in with the `ADMIN_EMAIL` / `ADMIN_PASSWORD` you
set in the backend `.env` and seeded.

---

## 4. How It All Fits Together

```
Admin (browser)
   │
   ▼
Next.js 14 Frontend  (Compose, Templates, Contacts, Campaigns, Settings…)
   │  REST calls, JWT in httpOnly cookie
   ▼
Express Backend API
   │
   ├── MongoDB  (templates, contacts, campaigns, logs, settings)
   │
   └── Sending Queue (in-app poller)
          │  batches of N, with a delay between batches
          ▼
       Nodemailer → Google SMTP → Recipient inbox
```

### The sending queue, in plain terms

When you click **Send Campaign**, the backend:

1. Resolves the final recipient list (groups + individual contacts, minus anyone
   unsubscribed or inactive) and writes one `EmailLog` row per recipient with
   `status: pending`.
2. Flips the campaign to `sending`.
3. A background poller (running inside the same Node process, checking every
   `QUEUE_POLL_INTERVAL_MS`) picks up campaigns in `sending` status and, respecting
   each campaign's **batch size** and **delay between batches**, sends the next batch
   of pending emails through Google SMTP.
4. Each send updates its `EmailLog` to `sent` or `failed` (with the SMTP response or
   error message) and increments the campaign's counters.
5. When no `pending` logs remain, the campaign flips to `completed`.

Because every unit of work lives in MongoDB (not in memory), **restarting the backend
mid-campaign is safe** — `resumeInFlightCampaigns()` runs on boot and picks any
`sending` campaign right back up.

**Why not Redis/BullMQ:** at RoundTable's current volume this adds real operational
weight (a Redis instance to run, monitor, and back up) for very little benefit. If
sending volume grows into the tens of thousands, `services/queue.js` is written so the
`processCampaignBatch` logic can move into a BullMQ worker without touching any of the
controllers or the frontend.

---

## 5. Google SMTP Notes

- Gmail's regular sending limit is **~500/day** (2,000/day on Google Workspace). The
  batch size + delay settings in **Settings → Sending Queue** are your main lever for
  staying under that and keeping deliverability healthy — defaults are 5 emails per
  batch, 2 minutes between batches.
- For anything beyond low-volume transactional/marketing mail, consider swapping the
  transport in `backend/src/services/mailer.js` for a provider built for bulk sending
  (Resend, Postmark, SES, SendGrid) — the rest of the app (queue, templates, logs)
  doesn't need to change, only `sendEmail()`.
- SMTP credentials are **never** returned by any API response — `Settings` only ever
  echoes back the SMTP *username*, never the app password.
- App Passwords saved from **Settings** are encrypted at rest. The same page can clear
  the saved override and return to the `.env` password, verify the SMTP connection,
  and send a real delivery test to an address you choose.
- When `BOUNCE_PROCESSING_ENABLED` is not `false`, the backend checks the Gmail inbox
  through IMAP for new delivery-status and standard abuse-feedback reports. Hard
  bounces mark contacts as `bounced`; complaints mark contacts as `complained` and
  add them to the unsubscribe suppression list. Only reports arriving after the
  processor's first successful connection are handled.

---

## 6. Unsubscribe Handling

Every marketing email footer includes a signed `{{unsubscribeUrl}}` link
(`GET /api/public/unsubscribe?email=...&token=...`). Clicking it:

- Adds the address to the `Unsubscribe` suppression list.
- Sets the matching `Contact.status` to `unsubscribed`.
- The sending queue filters out unsubscribed/inactive contacts automatically —
  they're excluded before a campaign's `EmailLog` rows are even created.

Transactional email (e.g. the Welcome Email template) is a separate `Transactional`
category and isn't tied to the marketing opt-in/out flow — treat account-security
notices as always-on, separate from marketing preferences, per the PRD.

---

## 7. Seeded Starter Templates

Running `npm run seed` creates these `EmailTemplate` documents (marked `isSystem`, so
they can be edited/duplicated but not deleted — duplicate first if you want a fully
editable copy):

- **Savings Invitation 01** — "What if your savings could do more?"
- **Savings Invitation 02** — "You earn money. But how much of it actually stays with you?"
- **RoundTable Thrift Invitation** — rotating thrift/Ajo structure
- **Welcome Email** — transactional, sent right after signup

All four use a shared, Outlook-safe, table-based HTML shell
(`backend/src/templates/seed/layout.js`) in the RoundTable Emerald/Deep Green palette
from the brief.

---

## 8. Personalisation Variables

Available in the composer's **Insert Variable** menu (`GET /api/public/variables`):

| Contact | Brand / Links | RoundTable Customer Data |
|---|---|---|
| `{{firstName}}` | `{{websiteUrl}}` | `{{totalSavings}}` |
| `{{lastName}}` | `{{savingsUrl}}` | `{{depositAmount}}` |
| `{{email}}` | `{{thriftUrl}}` | `{{interestAmount}}` |
| | `{{telegramUrl}}` | `{{maturityDate}}` |
| | `{{supportEmail}}` | `{{thriftName}}` |
| | `{{unsubscribeUrl}}` | `{{contributionAmount}}` |
| | | `{{payoutDate}}` |

The customer-data variables read from `Contact.customFields` — populate these per
contact (via the API, a future CSV column, or manually) as you wire this into your
main RoundTable user data.

---

## 9. Security Notes

- Single-admin JWT auth via httpOnly, `sameSite: lax` cookie — not readable by
  frontend JS, CSRF risk mitigated by SameSite + CORS allow-list.
- Rate limiting on `/api/auth/login` (10 attempts / 15 min) and globally on `/api`
  (600 req / 15 min).
- All template/campaign HTML is run through `sanitize-html` on save — script tags,
  event handlers, and non-email-safe tags are stripped before anything is stored or
  previewed.
- CSV import validates every email with a regex and skips duplicates instead of
  failing the whole batch.
- `helmet` is enabled; CSP is intentionally left off because the app needs to render
  admin-authored HTML (email previews) inside its own pages — if you put this behind a
  reverse proxy, consider a scoped CSP for the preview routes specifically.

---

## 10. What's Deliberately Left as a "V1" Trade-off

Being upfront about scope, given the size of the brief:

- **Visual editor** uses `document.execCommand` (contentEditable) for common
  formatting — reliable for headings/bold/italic/links/buttons/dividers/images/spacing,
  but not a full drag-and-drop email builder. The **HTML source editor** is always
  available side-by-side and both modes share the same underlying content, so nothing
  is ever locked behind one mode.
- **Role-based permissions** — the PRD asks for this, but you specifically asked for a
  single-admin login for now. `Admin` model and auth middleware are structured so
  adding a `role` field and a `requireRole()` check later is a small change, not a
  rewrite.
- **CSV import** currently supports `firstName,lastName,email` columns; extending it to
  import `customFields` (totalSavings, thriftName, etc.) is a small addition to
  `contactController.importCsv`.
