# Coach Bougerra

Live-streaming, formations and community platform for Coach Bougerra (Ultimate Health & Beauty),
in **French and Arabic** (right-to-left).

**Status: phase 2 — accounts, permissions, notifications and PV unlocks are real.** There is **no payment
at all**: formations are unlocked with PV (see below). The live room is not built yet, and the formations /
lives shown are still sample content.

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
- **Protected playback** (formations that need PV): the viewer's number and name drift over the picture, the picture
  goes black and pauses when the window loses focus, the tab is hidden or a screenshot key is pressed, and right-click is
  off. **This deters, it cannot stop** a phone camera or every recorder: a web page has no control over the screen.
  Recordings that come out black on all devices need the **video host's DRM** (Widevine/FairPlay), to be chosen
  together with the video hosting.
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
- **Sample content** (formations, lives): `src/lib/data.ts`. The default PV of each formation is `pv` there; staff
  override it in the workspace (table `video_pv`). The home page section explaining the PV steps is
  `src/components/site/UnlockSteps.tsx`.
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

`render.yaml` describes the website and its Postgres database, so Render creates both from the repository.

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

## What is still sample / not built

Formations and lives listings, the publish / schedule forms, and the pricing are placeholders;
the demo player plays nothing. The member path (`src/lib/path.ts`) is built on the sample formations. **Next:**
the live room (video calls, chat, hand-raise, screen share — LiveKit is the leading candidate), real video storage
and publishing, e-mail notifications, password reset by e-mail. The "EN DIRECT" banner is
already wired: the live room will plug into the same on-air switch.
