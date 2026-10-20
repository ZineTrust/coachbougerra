# Coach Bougerra

Live-streaming, formations and community platform for Coach Bougerra (Ultimate Health & Beauty),
in **French and Arabic** (right-to-left).

**Status: accounts, permissions, notifications, groups, formations and PV unlocks are real.** There is **no
payment at all**: formations are unlocked with PV (see below). The live room is not built yet, and the lives
shown are still sample content.

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
  Only the next two dates of a live can be reserved; lives marked "reserved access" need the access grant from staff.
- **Mon compte**: name, city and **profile photo** (resized to 256 px and stored in the database; shown only to
  the member, staff, and others if the member joined the leaderboard), plus install / push settings.
- **EN DIRECT banner**: staff press "Marquer en direct" on a live in Workspace → Lives and a red banner shows on
  every public page until they press "Terminer le direct". A gold "Bientôt" banner shows in the hour before a live.
  Visitors can close either for the rest of their visit.
- **App on the phone (PWA)**: the site can be installed on the home screen (manifest + `public/sw.js`, with an
  offline page) and sends push notifications. Push needs **HTTPS** (fine on Render) and the VAPID keys below
  (the public key is shipped to browsers; the private key must stay secret; never regenerate the pair after launch).
  On iPhone it works once the site is added to the home screen.

## Languages

`/fr/...` and `/ar/...`, switchable from the menu on every page. Texts live in
`src/messages/fr.ts` and `src/messages/ar.ts` (Arabic must have exactly the same keys — the
compiler enforces it). Sample formations and lives are bilingual in `src/lib/data.ts`.
Please have a native speaker read through the Arabic before launch.

## Where to change things

- **Coach Bougerra's story** (`story.*` in both message files) is a **draft written without any personal
  details**. Replace it with his real story. Photos are in `public/images/`, referenced in
  `src/lib/data.ts` (`BRAND.photos`); captions are also in `story.*`.
- **Sample content** (the lives only): `src/lib/data.ts`. Formations are created in the workspace (table `videos`,
  `src/server/videos.ts`). The home page section explaining the PV steps is `src/components/site/UnlockSteps.tsx`;
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

## Deploy on Render

`render.yaml` describes the website (and the first, temporary Render database). The site's database is the one
named by `DATABASE_URL`, which is set by hand in the dashboard: **Supabase** (see "Database on Supabase" below).

1. Push this folder to a **private** GitHub repository.
2. Render dashboard → **New → Blueprint** → pick the repository → Render lists the website and the database.
3. Fill in the secret values it asks for (they are never stored in the repo): `OWNER_EMAIL`, `OWNER_PASSWORD`
   (a **new** strong password, not the local one), `VAPID_SUBJECT` (`mailto:…`), `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and
   `VAPID_PRIVATE_KEY` (the pair from `.env.local`: keep the same pair for ever).
4. **Apply**. The first build takes a few minutes. Open `https://<name>.onrender.com/fr`, then sign in at
   `/fr/espace/connexion`.

Notes:
- The tables are created and the owner account is made automatically on the first start (a fresh database: the
  first member is 101). `/api/health` is the health check.
- **Free plans are for testing**: the site sleeps after ~15 minutes without visitors (the next visit takes about a
  minute) and the free database is deleted after a limited period. Move both to a paid plan before the real launch.
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

## What is still sample / not built

The lives listing and the "plan a live" form are placeholders (nothing is saved). **Next:**
the live room (video calls, chat, hand-raise, screen share — LiveKit is the leading candidate), a video host with
signed links / DRM if sharing of links becomes a problem, e-mail notifications, password reset by e-mail. The
"EN DIRECT" banner is already wired: the live room will plug into the same on-air switch.
