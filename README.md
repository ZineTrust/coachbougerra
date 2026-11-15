# Coach Bougerra

Live-streaming, formations and community platform for Coach Bougerra (Ultimate Health & Beauty),
in **French and Arabic** (right-to-left).

**Status: accounts, permissions, notifications, groups, formations and PV unlocks are real.** There is **no
payment at all**: formations are unlocked with PV (see below). **Lives are real too**: planned in the workspace and
held in a video room inside the site (see "Live room"; it needs a LiveKit server, free to start).

## Run it

```bash
npm install
npm run dev -- --port 3100     # http://localhost:3100  (redirects to /fr or /ar)
npm run build && npm start     # production
npm run lint
```

Requires Node 20+. Copy `.env.example` to `.env.local` and fill it in (see below).
No database to install: locally an embedded Postgres runs and stores its files in `.data/`
(git-ignored; delete the folder to start again from member number 101).

## Accounts

| Who | Signs in at | With | Can do |
| --- | --- | --- | --- |
| **Member** | `/fr/connexion` | e-mail **or member code**, + password | watch content they have access to, read notifications |
| **Staff** | `/fr/espace/connexion` (not linked publicly) | e-mail + password | whatever the owner ticked for them |
| **Owner** (Coach Bougerra) | same as staff | e-mail + password | everything, incl. creating staff accounts |

- **Member codes** start at **101** and go up by one, with no gaps (even after failed sign-ups).
  A member registers once with e-mail, phone, Ultimate consultant code, rank
  (Consultant / Manager / Senior Manager / Director) and password, then can sign in with the
  e-mail *or* the code. The password is always required: codes are sequential, so a code alone
  would let anyone open any account.
- The **owner account** is created on the very first start from `OWNER_EMAIL` / `OWNER_PASSWORD`.
  Afterwards the password lives in the database (change it in Workspace → Mon profil).
- **Staff permissions** (ticked per person in Workspace → Équipe, owner only):
  see members · manage members (give access, suspend, reset password) · read and answer messages ·
  send notifications · manage formations · manage lives.
  Permissions are checked on the server for every page and action.
- **Access grants (gifts)**: a member can be given *all formations*, *all lives*, or single formations, with no end date.
  Quickest way: Workspace → Membres → "Donner l'accès" on the member's row, or tick several members
  and use "Donner l'accès à la sélection" (this only adds access, it never removes any). Removing
  access is done on the member's own page. Needs the "manage members" permission.
- **Unlocking formations with PV** (no money anywhere on the site). A formation needs a number of PV (the monthly
  points a consultant earns on Ultimate; 0 = free). On a locked formation the member types how much PV they made this
  month and sends the request. Staff with the *manage members* permission see it in Workspace → **Demandes**, with the
  member's **Ultimate code** to look them up, the PV claimed vs required, and any PV already checked this month. They
  **accept** (the formation unlocks until the end of the month and the member gets a notification, plus a push if enabled,
  in the language they asked in) or **refuse** with an optional reason (the member is told as well). A request below the
  required PV is refused automatically. An approval can be taken back from the member's page.
  **Monthly reset**: every request is tied to its month (Algiers time). An approval only counts during that month and
  an unanswered request cannot be approved the month after, so on the 1st everything is locked again and members ask
  again: there is no job to run. Gifts (the grants above) are not affected. Staff with the *manage formations*
  permission change a formation's PV in Workspace → Formations (saved at once, applies to everyone).
- **Formations** (Workspace → Formations, permission *manage formations*): "Nouvelle formation" creates one:
  title and description in French and Arabic (at least one title; the other language shows the one written),
  category, duration (optional), **PV required** (0 = free), the **video picked in the phone's gallery** (see
  "Videos" below; one tap creates the formation and sends the video) and **draft / published**. A new
  formation can announce itself to every member (notification + push). Each formation then has its own page, where
  the video can be replaced or removed, with a 16:9 **cover image** (optional; without one a
  colour is used), a preview of the video and a delete button. The
  **order of the list is the order members see**, and "Mon parcours" follows it (its video steps take the formations
  one after the other; the home page shows the first four). Drafts and their covers are only visible to the team.
  A formation's address (slug) comes from its title when it is created and never changes afterwards. Views are
  counted once per member who opens a formation they may watch.
- **Videos**: in the new-formation form (or later on the formation's page) the team picks the video in the phone's
  gallery (or films it) and it is sent
  **straight to the storage** (Backblaze B2, see "Videos on Backblaze B2" below) in pieces of 16 MB, three at a time,
  with a progress bar. The page must stay open; a dropped connection only costs one piece, and picking the same file
  again carries on from where it stopped (the unfinished upload is remembered in `video_uploads`). MP4, MOV (iPhone)
  or WebM, 2 GB at most (`VIDEO_MAX_MB`). Sending a new video replaces the old file (deleted from the storage), as do
  "Retirer la vidéo" and deleting the formation. Members watch through our own player: the bucket is private, and
  `/api/videos/<slug>/watch` gives a signed address (valid 2 hours; the player asks again if it runs out) only to the
  team, to anyone for a free published formation, and to members who unlocked a PV one. A locked page, and the page
  of someone who may watch, never contain the file's key or address. As before, a pasted **YouTube / Vimeo link**
  ("Non répertoriée") is still possible (under "Ou utiliser un lien" in the form) and replaces an uploaded file; saving
  the form with that field empty leaves an uploaded file alone. Without the `STORAGE_*` settings the upload button is
  replaced by a notice and only links work. This is not a lock: a member who has access could still share a signed
  address while it lasts; a host with DRM (Bunny Stream, Mux, VdoCipher…) is the next step if that matters.
- **Protected playback** (formations that need PV): the viewer's number and name drift over the picture, the picture
  goes black and the video pauses when the window loses focus, the tab is hidden or a screenshot key is pressed, and
  fullscreen is our own button (the host's is hidden) so the name stays on screen.
  **This deters, it cannot stop** a phone camera or every recorder: a web page has no control over the screen.
  Recordings that come out black on all devices need the **video host's DRM** (Widevine/FairPlay), to be chosen
  together with the video hosting.
- **Groups** (`/groupes`, members): a member creates a group (up to 5), invites friends **by member code** (they get a
  push and accept or decline; up to 50 per group) and chats with them. The creator is the admin: invites, renames,
  removes people, deletes the group. Chats refresh every few seconds while the page is open (no websocket).
  **Official groups** are made by the team (Workspace → Groupes, permission *manage groups*): tick ranks (e.g. Manager)
  and every member of that rank is in automatically, including people who register later; add specific members by code;
  untick "members can write" for an announcements-only group. **The team can read every group** (and sees messages
  removed by members). Members are NOT told on the pages (the owner chose not to show a notice). Staff write as "Équipe". Group data is in `groups`,
  `group_members`, `group_messages`, `group_reads` (`src/server/groups.ts`).
- **Voice notes in groups**: a mic button next to the text box (shown only when the video storage is set up, see
  "Videos on Backblaze B2"). The browser records from the microphone with Web Audio and encodes a small **MP3**
  itself (`src/lib/voice-recorder.ts`: mono, 16 kHz, 32 kbit/s, about 4 KB per second; MP3 because it plays on every
  phone while WebM / MP4 recordings do not), up to **3 minutes / 1.5 MB**. `POST /api/groups/<id>/voice?seconds=` stores
  it in the bucket under `voice/<group>/` and adds a message; `GET /api/groups/<id>/voice/<message>` checks the person
  is in the group (or is the team, `?as=team`) and redirects to a 2-hour signed address. Voice files are deleted with
  their group. The mic needs https (or localhost) and the person's permission.
- **Contact button and messages**: signed-in members get one floating button on every public page that
  opens a chat with the team (visitors are invited to sign in). Staff with the *messages* permission read
  and answer from Workspace → Messages, with an unread badge in the sidebar. Replies appear on the member's
  contact button. Messages are plain text (2000 characters max) and rate-limited per member.
- **Notifications**: staff write a message and send it to everyone or to specific member codes.
  Members open them from a drop-down panel on the bell (and in full under Mon compte), with an unread badge.
  A member who enabled notifications on their phone (Mon compte → "Sur votre téléphone") also gets them as a
  push notification, same for a staff reply to a message.

## Member space

Signed-in members get a menu on their number in the header with these pages:

- **Objectif du mois** (card on Mon compte and Mon parcours): the member sets a PV target for the month and writes
  down the PV made so far; a bar fills, with the PV left, the days left (Algiers time) and the closest locked formation
  they could ask for. It is **personal tracking**: it unlocks nothing (unlocks still go through a request the team
  checks on Ultimate). One row per member and month in `member_goals`, so a new month starts empty and last month's
  result is shown in small print.
- **Inviter** (`/invitation`): every member has a random link token (`members.invite_token`, made on first use) and a
  link `…/<lang>/invitation/<token>`, with a ready WhatsApp message, share / copy buttons and a **QR code** (SVG made
  on the server with `qrcode`, white tile in every theme, PNG download). The public page `/invitation/<token>` says who
  invites (noindex) and leads to sign-up with the token; the new member keeps `members.sponsor_code`, the inviter gets a
  notification + push, and sees who joined (with rank and date). The team sees "invited by" on the member page. Set
  `SITE_URL` (e.g. a custom domain) to fix the address used in the links; otherwise it is read from the request.
- **Apparence** (the sun/moon button in the headers and a card on Mon compte): theme **light / dark / auto** and text
  size **normal / large / very large**, kept per device in localStorage (`src/lib/appearance.ts`; a script in the
  page head applies it before painting, so there is no flash). Light is the default. Dark mode is `src/app/dark.css`:
  the site is designed light first, so that file re-colours the classes that mean "light surface" or "text on a light
  surface" (add a line there when a new such colour class is used). Text size changes the root font size, which is why
  all text sizes are in rem (a codemod turned the old `text-[13px]` into `text-[0.8125rem]`: keep using rem).

- **Assistant IA** (`/assistant`, in the member menu): a chat where members ask anything, in **Arabic (also the
  Algerian dialect and arabizi) or French**: how the platform works, network marketing and business, the Ultimate
  products, or any other topic. It runs on **Groq's free plan** (no card): set `GROQ_API_KEY` (a key from
  console.groq.com → API Keys) in Render → Environment; without it the page says the assistant is not active yet.
  How it works (`src/server/assistant/`):
  - **Knowledge, not training.** Each question is searched (BM25, Arabic and French normalised, `search.ts` +
    `text.ts`) in short notes: the platform (`knowledge/site.ts`), coaching and prospecting advice
    (`knowledge/coaching.ts`), the 191 catalogue products (`products.json`, no dosage on purpose) and a live list of
    the published formations. The best 2–4 notes go into the prompt (`prompt.ts`: rules in French, answers in the
    language of the question). A short follow-up with no match of its own borrows the previous question.
  - **The owner's notes** (Workspace → *Assistant IA*, owner only): notes added there become knowledge at once (60 s
    cache, dropped on every save). **Write the official compensation plan, prices and rules there**: without them
    the assistant says it does not have them (a built-in note forbids inventing figures). The same page lists the
    answers thumbed down by members or given with little matching knowledge, plus simple counts.
  - **Free-plan limits.** Models are tried in turn (`provider.ts`: gpt-oss-120b, llama-3.3-70b, gpt-oss-20b,
    llama-3.1-8b); a model that answers 429 is left alone for its `retry-after` wait and the next one answers.
    Groq limits each model separately (about 1,000 requests a day on the big ones), so **`ASSISTANT_DAILY_LIMIT`
    (default 5 questions per member per day, Algiers time)** keeps the total inside it: about 300 questions a day
    in all. Raise the limit only after adding a paid key. Also: 8 questions a minute, one at a time per member,
    600 characters per question, answers of at most 600 tokens.
  - **Privacy.** The AI service receives the question, the last few messages, the matching notes and the member's
    rank / monthly goal / unlocked count, never a name, phone, e-mail or code. Conversations are stored
    (`assistant_chats`, `assistant_messages`) and the owner can read the flagged ones; the page tells members so.
  - **Guardrails** are in the prompt: no promised income, no health claims about products, no legal or tax advice,
    honest about being an AI, no invented Ultimate facts. A prompt is not a guarantee: read the "answers to improve"
    list now and then.
  - Another provider (or Claude) works through the same chat-completions API: set `ASSISTANT_API_URL`, the key in
    `GROQ_API_KEY` and `ASSISTANT_MODELS` (comma-separated, best first).
  Tested here against a stand-in for Groq (Arabic and French questions, retrieval into the prompt, fallback on 429,
  rejected key, dropped stream, daily cap, one at a time, notes added / disabled / deleted, no personal data sent,
  RTL, phone width, dark mode) but **not against the real Groq**: ask a few Arabic questions yourself first.
- **Mon parcours** (`/mon-parcours`): a list of steps chosen for their rank (`src/lib/path.ts`: profile,
  formations, scripts, a live), a progress ring, points, level, badges and an optional leaderboard.
  Everything is **derived from what the member did**, nothing is stored apart from "formation finished" and
  "script used": change the numbers in `src/lib/gamification.ts` and every score follows.
  Points: profile 20 · formation finished 30 · new script copied 5 · live reserved 10. Levels at 0 / 100 / 250 /
  500 / 1000 points. The leaderboard shows only members who ticked "Apparaître dans le classement" (off by default).
- **Boîte à outils** (`/boite-a-outils`): 18 ready-to-copy messages in French and Arabic (`src/lib/toolbox.ts`),
  with the contact's first name filled in. Copying one counts as using it.
- **Calendrier** (`/calendrier`): month view in Algiers time, reserve a place at a live, "add to my calendar"
  (`/api/calendar.ics?live=…`) and a subscribe link for the whole schedule (`/api/calendar.ics`).
  A place can be reserved at any planned live that is not over; lives marked "reserved access" need the access grant
  from staff, and moving a live to another date keeps the places already reserved.
- **Mon compte**: name, city and **profile photo** (resized to 256 px and stored in the database; shown only to
  the member, staff, and others if the member joined the leaderboard), plus install / push settings.
- **EN DIRECT banner**: when staff press "Démarrer" on a live (Workspace → Lives → the live), a red banner shows on
  every public page, leading to the live's room, until they end the live. A gold "Bientôt" banner shows in the hour
  before a live. Visitors can close either for the rest of their visit.
- **App on the phone (PWA)**: the site can be installed on the home screen (manifest + `public/sw.js`, with an
  offline page) and sends push notifications. Push needs **HTTPS** (fine on Render) and the VAPID keys below
  (the public key is shipped to browsers; the private key must stay secret; never regenerate the pair after launch).
  On iPhone it works once the site is added to the home screen.

## Languages

`/fr/...` and `/ar/...`, switchable from the menu on every page. Texts live in
`src/messages/fr.ts` and `src/messages/ar.ts` (Arabic must have exactly the same keys — the
compiler enforces it). Formations and lives are bilingual too: each has a French and an Arabic title and description.
Please have a native speaker read through the Arabic before launch.

## Where to change things

- **Coach Bougerra's story** (`story.*` in both message files) is a **draft written without any personal
  details**. Replace it with his real story. Photos are in `public/images/`, referenced in
  `src/lib/data.ts` (`BRAND.photos`); captions are also in `story.*`.
- **Lives and formations** are created in the workspace (tables `lives` / `videos`, `src/server/lives.ts` /
  `src/server/videos.ts`; the video room is in `src/components/live/` and `src/server/livekit.ts`). The home page section explaining the PV steps is `src/components/site/UnlockSteps.tsx`;
  the steps of "Mon parcours" per rank are in `src/lib/path.ts`.
- **Colours & fonts**: design tokens at the top of `src/app/globals.css`.

## Database & going live

- Set `DATABASE_URL` to a real Postgres (Supabase, Render Postgres…). The tables are created
  automatically at start-up (`src/server/schema.ts`), the same SQL as locally.
- Set `OWNER_EMAIL`, `OWNER_PASSWORD` (and `OWNER_NAME`) on the host for the first start.
- Set `VAPID_SUBJECT`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` on the host to turn push on
  (`npx web-push generate-vapid-keys`). `NEXT_PUBLIC_…` is baked in at build time, so redeploy the frontend after
  setting it. Without the keys everything works, just without push.
- Sessions live in the database; login attempts are rate-limited in memory (per server instance).
- `next.config.ts` sets the `next-intl` alias by hand instead of using its plugin, because the plugin
  loads a native compiler add-on that fails on some Windows machines. Same effect, nothing lost.

### Moving to another database (copy everything, members included)

Render's free Postgres expires after 30 days (then 14 days of grace, then it is deleted). To move to
Supabase (or anywhere else) without losing anyone:

1. Keep the site off (or tell people not to sign up): a new member on the empty database would get
   a number that already belongs to an old member.
2. Put the two addresses in `.env.local` (never in git or in a chat):
   `OLD_DATABASE_URL` = the old database (Render: "External Database URL", after allowing your IP
   in its Access Control) and `NEW_DATABASE_URL` = the new one (Supabase: "Session pooler" string).
3. `node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --env-file=.env.local scripts/copy-database.mjs --check`
   reads the old database and lists every table with its row count (changes nothing).
4. The same command without `--check` builds the tables in the new database, copies everything inside
   one transaction, compares every table (row count + a fingerprint of every row) and only then commits.
   It refuses a new database that already has members (unless `--replace` is given). The old database
   is never written to.
5. In Render → Environment, replace `DATABASE_URL` with the new address, then deploy.

## Deploy on Render

`render.yaml` describes the website only. The site's database is the one named by `DATABASE_URL`, which is set by
hand in the dashboard: **Supabase** (see "Database on Supabase" below). Render's own free Postgres is not used any
more: it expires after 30 days and is then locked (that is what took the site down on 2026-11-15).

1. Push this folder to a **private** GitHub repository.
2. Render dashboard → **New → Blueprint** → pick the repository → Render lists the website.
3. Fill in the secret values it asks for (they are never stored in the repo): `OWNER_EMAIL`, `OWNER_PASSWORD`
   (a **new** strong password, not the local one), `VAPID_SUBJECT` (`mailto:…`), `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and
   `VAPID_PRIVATE_KEY` (the pair from `.env.local`: keep the same pair for ever).
4. **Apply**. The first build takes a few minutes. Open `https://<name>.onrender.com/fr`, then sign in at
   `/fr/espace/connexion`.

Notes:
- The tables are created and the owner account is made automatically on the first start (a fresh database: the
  first member is 101). `/api/health` is the health check.
- **Free plans are for testing**: the site sleeps after ~15 minutes without visitors (the next visit takes about a
  minute) and a free Supabase project pauses after about a week without any request. Move both to a paid plan before the real launch.
- Changing a `NEXT_PUBLIC_*` value needs a new deploy (it is baked in at build time).
- Custom domain: service → Settings → Custom Domains, then add the DNS record Render shows; HTTPS is automatic.
- The `pg` code path was tested against a Postgres-protocol server before the first deploy (sign-up, unlock
  requests, approvals, reservations, owner bootstrap).

### Database on Supabase

The site only needs a plain Postgres: it uses none of Supabase's own login, storage or API.

1. supabase.com → **New project**: name `coach-bougerra`, region **Central EU (Frankfurt)**, a database password
   (letters and digits only, so it can be pasted into an address without escaping). Keep that password.
2. Project → **Connect** → **Session pooler** → copy the connection string (it ends in `:5432/postgres`) and put
   the password in place of `[YOUR-PASSWORD]`. Use the *pooler* address, not "Direct connection": Render only has IPv4.
3. Render → the service → **Environment** → set `DATABASE_URL` to that string → **Save, rebuild and deploy**.
4. The tables are created on the first start. Every table has row-level security switched on with no policy
   (`src/server/schema.ts`), so Supabase's public data API cannot read member data; the site itself connects as the
   table owner and is not affected. If the dashboard offers it, also turn the **Data API** off (Project Settings).
5. Free Supabase has no downloadable backups: before real members arrive, either move to a plan with backups or
   export the members regularly.

### Videos on Backblaze B2

Uploaded videos need an S3-compatible bucket; this was made for **Backblaze B2** (10 GB free, no card reported at
sign-up; check backblaze.com). Cloudflare R2, Wasabi or MinIO work with the same four settings.

1. backblaze.com → create an account → **Buckets → Create a Bucket**: name `coach-bougerra-videos`, **Private**,
   encryption off, Object Lock off, and under *Lifecycle* choose **"Keep only the last version of the file"**
   (otherwise a deleted video stays, and counts, as an old version).
2. **Application Keys → Add a New Application Key**: allow access to that one bucket only, **Read and Write**. Copy
   the *keyID* and the *applicationKey* now (the secret is shown once). The bucket page shows its **Endpoint**
   (`s3.<region>.backblazeb2.com`).
3. Render → the service → **Environment**: `STORAGE_ENDPOINT=https://s3.<region>.backblazeb2.com`,
   `STORAGE_BUCKET=<bucket name>`, `STORAGE_KEY_ID=<keyID>`, `STORAGE_KEY_SECRET=<applicationKey>` → Save.
   Optional: `VIDEO_MAX_MB` (default 2048), `STORAGE_QUOTA_GB` (only the "used / total" line, default 10).
4. **Allow the website to send to the bucket (once).** Backblaze's web page only offers download rules, so run:
   `node --env-file=.env.local scripts/storage-cors.mjs https://<your-site>.onrender.com` with the same four
   `STORAGE_*` lines in `.env.local`. That call needs a key allowed to change bucket settings: use the account's
   **master application key** (Account → Application Keys) as `STORAGE_ADMIN_KEY_ID` / `STORAGE_ADMIN_KEY_SECRET`
   in `.env.local` for this one run, then delete those two lines. Add other origins (a custom domain) as extra arguments.
5. Open a formation, choose a short video: it should reach 100 %, play in the preview, and show in the bucket.

Good to know:
- **Downloads are free up to 3× the stored size per month** (about 30 GB of viewing with 10 GB stored), then
  $0.01/GB: a 1 GB video watched by 30 members already uses it. Film in **1080p or 720p, not 4K**, and choose the
  *most compatible* format on iPhone (Settings → Camera → Formats), which also plays everywhere.
- Files are served as they were recorded: no quality switching on slow connections and no conversion. An iPhone
  "high efficiency" (HEVC) video may not play on every member's phone; the uploader warns when its own browser
  cannot read the file. A video service that converts (Mux, Bunny Stream) is the upgrade if that bites.
- Tested here against an in-memory S3 stand-in (pieces, resume after a reload, retries, an expired address, a missing
  file, clean-up on replace / remove / delete) but **not yet against a real Backblaze bucket**: do step 5 first.

## Live room (Salle de live)

The lives are real: the team plans them in **Espace → Lives** (title and description in French and Arabic, date and time
in Algiers time, length, who may enter), then opens the room on the day. Members get the page `/lives/<id>`, the
site-wide red banner appears while a live is on air, and the page of a live that has not begun opens its room by itself
the moment the host presses "Démarrer".

**In the room:** the host's camera, microphone and screen share; the audience watches and listens; a chat; a raised hand
that the host sees (and answers by bringing the member **on stage** to speak, or by sending them out); an "audio
only" switch for members on a weak connection; the phone stays awake. Reserved lives (`premium`) need the team's grant
for that member, lives for the team only are invisible to members. Who came in is counted (Espace → Lives → the live).

**The video itself does not go through the website.** Render cannot carry live video (it needs UDP ports), so the site
signs a ticket for each person and the browser talks to a **LiveKit** server (open source). Three settings turn it on,
the same whichever LiveKit it is, in Render → Environment and in `.env.local`:

```
LIVEKIT_URL=wss://<your-project>.livekit.cloud     (or wss://live.<your-domain>)
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
```

Optional: `LIVEKIT_MAX_PARTICIPANTS` (a limit of our own per room; 0 or empty = none).

### Option A, to start for free: LiveKit Cloud

1. cloud.livekit.io → create an account and a project (the **Build** plan is free, no card).
2. Project → **Settings → Keys**: copy the WebSocket URL (`wss://….livekit.cloud`), then create an API key and copy its
   key and secret (the secret is shown once). Paste the three values in Render → Environment → Save (the site restarts).
3. Free limits (check livekit.io/pricing, they change): about 5,000 participant-minutes a month, 50 GB of
   downstream, 100 people at the same time. That is roughly **80 hours of one person watching a month**: enough for
   tests and a small pilot, not for a big weekly live. Audio-only viewers count less bandwidth but the same minutes.

### Option B, for real audiences: your own LiveKit on a small server (about €5 a month)

A €5–6 server (Hetzner CX-class, Contabo, OVH… 2–4 vCPU, with a very generous traffic allowance) carries a few hundred
viewers; LiveKit measured about 190 viewers per CPU core for a single speaker. It needs a card or PayPal and a domain
name (a sub-domain such as `live.coachbougerra.com` pointing to the server). The files are in `deploy/livekit/`:

1. Ubuntu server with Docker. Open ports **80, 443, 7881/tcp, 3478/udp, 50000-60000/udp**.
2. Put the three values of `deploy/livekit/.env.example` in a `.env` file next to `docker-compose.yml`, and your sub-domain in
   `Caddyfile`. `docker compose up -d` starts LiveKit and the certificate-managing proxy (Caddy).
3. Render → `LIVEKIT_URL=wss://live.<your-domain>` with the same key and secret. Nothing else changes in the site.

### Good to know
- Tested here with a mock of the LiveKit API and, when a LiveKit server was available, with two browsers (host + viewer).
  A first real live with a handful of members is the best test: phone data, Arabic interface, headphones.
- The chat only exists while the room is open: someone who arrives late sees what is written from then on.
- A live left "on air" by mistake closes itself on the site after 12 hours; the host can end it at any time.
- The **replay**: record the live (phone or computer), publish the video as a formation (Espace → Formations), then edit the
  live and choose it under *Replay*. It then shows on the public Lives page.
- Members sent out of a live cannot come back into it (kept in memory: a restart of the site forgets it).

## What is still sample / not built

**Next:** automatic recording of lives (LiveKit egress, needs the server option B), a video host with signed links /
DRM if sharing of links becomes a problem, e-mail notifications, password reset by e-mail.
