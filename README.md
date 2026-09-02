# Code Crafters Club — Full-Stack Platform

Official digital platform for the ENTC department's Code Crafters Club: event
management, e-certificates, year-wise club membership history, and a full
admin/RBAC system.

**Stack:** React (Vite) + Node.js/Express + PostgreSQL (Prisma ORM) — SQL only, no MongoDB.

---

## What's built so far (Phases 1–6)

- ✅ Project architecture (`server/` clean layered structure: routes → controllers → services → Prisma)
- ✅ Full normalized SQL schema (`prisma/schema.prisma`) covering every entity in the spec: users, OTP, club years/members, events, registrations, waitlist, payments, certificates, gallery, winners, feedback, announcements, notifications, recruitment, leaderboard, timeline, contact messages, audit log
- ✅ Security middleware stack: Helmet, CORS (credentialed), rate limiting (general + strict auth limiter + OTP cooldown), HPP, input sanitization, centralized error handler with consistent `{ success, message, data }` shape
- ✅ **Authentication module, fully wired end-to-end:**
  - Register (name, email, password, confirm password, phone, college, graduation year, CAPTCHA, terms checkbox)
  - Email OTP verification (6-digit, bcrypt-hashed, 5-minute expiry, attempt limiting, resend with 1/min cooldown)
  - Login (email + password + CAPTCHA, generic error message to prevent email enumeration)
  - Forgot / Reset password (OTP-based, strength-validated new password, revokes all existing sessions on reset)
  - JWT access token (15 min) + HTTP-only, `SameSite=strict`, secure refresh token cookie (7 days) with **rotation** (each refresh revokes the old token and issues a new one)
  - Logout (revokes refresh token server-side)
- ✅ **RBAC module:** permission matrix (`config/permissions.js`) mapped to all 9 roles from the spec, `requirePermission()` / `requireRole()` middleware, authorization always enforced server-side off the JWT — never trusts a role field from the client
- ✅ **Events module (read + admin write):** list with filters (category/mode/search/year/upcoming), pagination, slug-based detail lookup, draft visibility restricted to staff, create/update/delete gated by `CREATE_EVENT`/`EDIT_EVENT`/`DELETE_EVENT` permissions, live club-stats endpoint, cancel-instead-of-delete when an event has confirmed registrations
- ✅ **Event registration module — free events, waitlist, cancellation:**
  - Register / cancel per event, `requireVerifiedEmail` enforced
  - Duplicate-registration prevention (checked in service + backed by a DB unique constraint)
  - Automatic waitlist when an event is at capacity, with position tracking
  - Cancelling a confirmed registration **automatically promotes the earliest waitlisted student** and emails them
  - Paid-event registration currently returns a clear "online payments aren't live yet" error rather than faking a payment step (that's Phase 8)
  - `GET /registrations/me` for the student's own view, `GET /events/:eventId/registrations` for staff (gated by `MANAGE_REGISTRATIONS`)
  - **All six core business rules verified by actually running the service logic** against an in-memory fake DB (see Verification below) — not just read for correctness
- ✅ **Razorpay payment module — paid events now fully work:**
  - `POST /payments/create-order`: validates the event is open/not full/paid, creates or reuses a `PENDING_PAYMENT` registration, creates a Razorpay order, persists a `Payment` row
  - `POST /payments/verify`: **recomputes the HMAC-SHA256 signature server-side** from the order + payment IDs and the account's secret key, and only confirms the registration if it matches — the frontend's "payment succeeded" callback is never trusted on its own
  - Idempotent verification (a retried request after a network blip won't double-process or double-email)
  - Paid events don't support waitlisting in this phase — charging a waitlisted student who may never get a seat is a refund problem intentionally left out rather than half-built
  - Frontend: real Razorpay Checkout integration on the Event Details page (dynamic script loading, prefilled user info, failure/dismiss handling) — the previous "coming soon" button is gone
  - **Signature verification tested against 5 real attack scenarios** (see Verification below): legitimate signature, forged signature, signature signed with the wrong secret, signature replay against a different order, and malformed/empty signature — all passed on actual `crypto` execution, not review
- ✅ **QR check-in / attendance module:**
  - `POST /events/:eventId/checkin` (staff, `MANAGE_ATTENDANCE`) — validates the QR token belongs to *this* event, isn't cancelled, isn't a pending-payment registration, and hasn't already been checked in, then marks attendance `PRESENT` and — this is the important part — **sets `certificateStatus` to `ELIGIBLE`**, which is what Phase 10 (certificates) will actually gate on, tying certificate eligibility to real attendance instead of just "registered"
  - `GET /events/:eventId/checkin/summary` — live present/absent counts for staff
  - Frontend: a real digital event pass with a scannable QR code (`qrcode.react`) shown from the student dashboard, and a staff check-in scanner page (`/admin/checkin`, restricted to Technical/Event Management/Hospitality teams + Super Admin) that validates a token and shows a live checked-in count
  - **All 5 attendance business rules verified by actually running the service logic** against an in-memory fake DB: valid check-in, duplicate check-in rejected, cancelled registration rejected, wrong-event QR token rejected, unrecognized token rejected
- ✅ **Certificate generation module — real PDFs, not placeholders:**
  - `POST /events/:eventId/certificates/generate` (staff, `GENERATE_CERTIFICATE`) — bulk-issues certificates **only for registrations attendance marked `ELIGIBLE`** (from Phase 9), skips anyone already issued one, never re-issues on retry
  - Certificates are rendered as real PDFs server-side with `pdfkit`: club name, "Certificate of Participation", student name, event + date, unique certificate ID (`CCC-YYYY-XXXXXX`), a scannable QR code linking to the public verification page, and all three required signature lines (President, Faculty Coordinator, Technical Team)
  - `GET /certificates/verify/:code` — public, no auth, returns only student name / event / date / issue date (never email or phone) per spec section 20
  - `GET /certificates/:code/download` — authenticated, restricted to the certificate's owner or Technical Team/Super Admin
  - `GET /certificates/me` — student's own certificate list
  - Frontend: real "My Certificates" panel on the dashboard with working download (fetched as an authenticated blob, not a plain link, since downloads need the bearer token), the public Verify Certificate page now calls the real endpoint and auto-verifies when reached via a QR scan (`?code=...`), and staff get a one-click "generate certificates" action on the check-in scanner page
  - **The certificate PDF was actually rendered and visually inspected**, not just generated as bytes — this caught two real layout bugs (a missing third signature line, and a signature line overlapping the QR code) that pure code review would have missed entirely
  - **Generation logic verified against an in-memory fake DB**: only eligible+unissued registrants get certificates, never-attended registrants are correctly excluded from the query, and a retry-after-partial-failure scenario (cert exists but status wasn't updated) correctly skips instead of duplicating
- ✅ **Club members module — year-scoped, privacy-gated, with real file uploads:**
  - `POST /members` / `PUT /members/:id` (staff, `MANAGE_MEMBERS`) — adds a *registered* student (looked up by email — this doesn't create accounts) to a specific year's roster, with team/position/skills/description/social links, plus multipart CV (PDF, 5MB max) and profile photo (JPEG/PNG/WebP, 2MB max) uploads validated by MIME type and size
  - `GET /members/year/:year` (public) — the actual year-selector data source, replacing the earlier placeholder
  - `DELETE /members/:id` — **soft-removes** from that year only (sets `leftAt`), never deletes the underlying record — business rule 8 ("previous-year data must never be accidentally overwritten") holds because each year is already a separate row
  - **Contact info (email/phone) and CV are hidden from public API responses unless the member has `showContact: true`** — and, critically, this isn't just a UI hide: the CV download route independently re-checks `showContact`/staff/self-ownership server-side, so knowing a member's ID doesn't bypass anything
  - Frontend: the Team page (previously an honest "not connected yet" placeholder) now shows real members grouped by team with a working year selector, and a staff-only Manage Members page handles add/remove with file uploads
  - **7 business-rule assertions run against an in-memory fake DB**, including one that specifically targets the privacy boundary: a random logged-in student is denied direct CV access by member ID even though the member's own account and staff accounts are allowed — this is exactly the kind of check that's easy to get subtly wrong and worth actually running rather than trusting on read
- ✅ **Admin dashboard — a real staff home base, not scattered tool pages:**
  - `GET /analytics/overview` (staff, `VIEW_ANALYTICS`) — total students, events, upcoming/completed counts, total registrations, total revenue, certificates issued, current club member count
  - `GET /analytics/registrations-by-month`, `/events-by-category`, `/revenue-by-event`, `/students-by-graduation-year` — the chart data sources
  - Frontend: `/admin` now renders real Recharts visualizations (bar chart for registrations/month, pie chart for events by category, horizontal bar for revenue by event, bar chart for students by graduation year) wired to the endpoints above, plus quick links into the event-creation, check-in, and member-management tools that used to be disconnected pages
  - **A full event create/edit form** (`EventForm.jsx`, shared between Create and Edit) replacing the "only via direct API call" gap from earlier phases — validated with the same Zod shape as the backend, and staff now see an "Edit event →" link directly on the event details page
  - **Admin routes are code-split and lazy-loaded** (`React.lazy` + `Suspense`) — recharts alone added ~400KB to the bundle; splitting it out dropped the main JS bundle from 816KB back to 394KB, verified by actually rebuilding and comparing the chunk output, not assumed
  - **Month-bucketing logic (the one piece of this phase with real date-math risk) tested against an in-memory fake DB**: correct bucket count, registrations outside the requested window excluded, correct counts per bucket including the most-recent and oldest, and — the check that actually matters for a chart — months with zero registrations still appear as zero-count buckets instead of silently vanishing and creating gaps
- ✅ **Announcements — the homepage section that was designed for from Phase 5 but never wired:**
  - `POST/PUT /announcements` (staff, `MANAGE_ANNOUNCEMENTS` — Technical Team, Content Team, or Super Admin) with DRAFT/PUBLISHED states
  - **`publishedAt` is stamped exactly once**, the first time an announcement transitions to PUBLISHED — re-editing already-published content (fixing a typo) does *not* reset it and jump the homepage ordering, and this is the one business rule in this module actually worth testing, not just reading
  - `GET /announcements` (public) only ever returns PUBLISHED items — drafts are invisible outside the staff-only `/announcements-admin/all` endpoint
  - Frontend: a real "Latest Announcements" section now renders on the homepage, and a staff Manage Announcements page (create/edit/publish/unpublish/delete) is reachable from both `/admin` (Technical Team) and the student Dashboard's quick links (Content Team, who can't reach `/admin` itself since they lack `VIEW_ANALYTICS` — caught this access gap while wiring the UI and added the link where they'd actually land)
  - **5 assertions run against an in-memory fake DB**: draft creation doesn't set `publishedAt`, publishing immediately sets it, publishing a draft later sets it, **editing an already-published announcement does not reset it** (the rule that matters), and the public listing excludes drafts entirely
- ✅ **Notifications & scheduled reminders — the `Notification` model now does something proactive:**
  - A `node-cron` job (every 15 min) sweeps upcoming events and sends 7-day / 1-day / 1-hour reminder emails + in-app notifications per spec section 42, plus event-cancellation notices to every affected registrant when staff cancel an event with confirmed registrations
  - **Idempotent by design**: each reminder tier checks "has this exact (user, event, type) already been sent" before creating anything, so the sweep is safe to run at any interval, survive a server restart, or even be called twice in a row — verified by literally calling it twice back-to-back in the test and asserting zero duplicates
  - **A real overlapping-threshold bug was caught and fixed before shipping**: the first version fired every tier whose threshold was "not yet passed" — meaning an event created only 20 hours before it started would send both the 1-day *and* a factually wrong "reminder: in 7 days" message simultaneously, since 20 hours satisfies "≤ 168 hours" too. Fixed by giving each tier an explicit band (e.g. the 1-day tier only fires when 1h < hours-until-start ≤ 24h), so only the tier that matches reality ever fires — caught by the test failing on first run, not by re-reading the code
  - Schema gained a nullable `eventId` on `Notification` to make per-event dedup possible — deliberately **not** a DB-level unique constraint on `(userId, eventId, type)`, because reactive notification types (registration confirmed, payment successful, waitlist) legitimately recur for the same event if a student cancels and re-registers; only the reminder logic enforces its own idempotency in application code, where it belongs
  - Frontend: the Dashboard's notifications card went from a permanent `—` placeholder to a real unread count, backed by an actual notifications panel (mark-as-read, mark-all-read) — closing a gap that existed since the very first dashboard build in Phase 5
- ✅ **Recruitment — "Join the Club" pipeline, using a `RecruitmentApplication` model that had sat unused in the schema since Phase 1:**
  - `POST /recruitment` (public — logged in or not) accepts applications across the 5 recruitable teams (Technical, Event Management, Hospitality, Content, Marketing — deliberately excluding President/VP, which the spec treats as elected rather than applied-for), with an optional PDF resume upload
  - If the applicant is logged in, their `userId` is captured on the application; anonymous applications are still accepted, matching spec section 47's field list (name/email/phone captured directly, no account required)
  - Staff (`MANAGE_RECRUITMENT`) get a filterable application list, status transitions (Applied → Under Review → Shortlisted → Interview → Selected/Rejected) that trigger a status-update email each time, and resume review
  - **The resume access-control route deliberately does NOT require `MANAGE_RECRUITMENT`** — it only requires being logged in at all, because the applicant should be able to check their own submitted resume too. The staff-or-self decision is made inside the service, not the route, so a permission-gated route wouldn't have blocked the legitimate self-access case. This is the same class of bug caught in the club-member CV route last phase, and this time I tested the exact boundary directly rather than assuming the pattern held: staff can access any resume, the applicant can access their own, and a random logged-in student is rejected even knowing the application ID
  - **7 assertions run against an in-memory fake DB**: userId correctly linked for logged-in applicants, anonymous applications accepted, self-access works, staff-access works, **random-student access is rejected**, status updates persist, and staff filtering by status works correctly
- ✅ **Event feedback — gated by real attendance, not just registration:**
  - `POST /events/:slug/feedback` — eligibility is checked against `attendanceStatus === 'PRESENT'` (set during Phase 9's QR check-in), **not** merely having a confirmed registration. A student who registered but never showed up cannot leave feedback, even though they're still "registered"
  - Duplicate prevention is enforced both at the DB level (`@@unique([eventId, userId])`, present in the schema since Phase 1) and in application code with a clean error message rather than a raw constraint violation
  - `GET /events/:slug/feedback/summary` (public) returns only aggregate averages — count and star ratings — and the service **never includes individual comments in this response**, even by accident, since it's a structurally separate query path from the staff detail view
  - `GET /events/:eventId/feedback` (staff, `VIEW_ANALYTICS`) returns full detail including comments and suggestions, reusing the broad "staff insight" permission already granted to President/VP/Technical Team/Super Admin rather than inventing a new one for what's fundamentally the same kind of access
  - Frontend: a real feedback section on the event details page (star ratings + comments, shown only to attendees of events that have happened, with public average ratings visible to everyone), and a staff-only feedback review page
  - **Caught and fixed a genuine UX/correctness bug before it shipped**: the first draft of the frontend eligibility check used `registration.status === 'CONFIRMED'` to decide whether to show the feedback form — but confirmed and attended are different things, and that would have shown the form to no-shows only for them to hit a confusing rejection on submit. Fixed by threading the real `attendanceStatus` through from the registrations lookup instead
  - **Route fallthrough behavior verified with actual HTTP requests against a running server** (not just reasoned about): confirmed `GET /api/events/:slug` and `GET /api/events/:slug/feedback/summary` both resolve to the correct handler rather than the multi-segment path accidentally matching the single-segment `GET /:slug` route
  - **6 business-rule assertions run against an in-memory fake DB**: no registration → rejected, registered-but-never-checked-in → rejected (the rule that actually matters), attended → accepted, duplicate submission → rejected, public summary aggregates correctly **and excludes comments**, staff view includes comments
- ✅ **Leaderboard — the last dormant schema model (`PointRule`/`PointLedger`, seeded since Phase 1) is now actually wired to something:**
  - Points are awarded **automatically** at the two points in the system where they're actually earned: QR check-in (Phase 9) and certificate issuance (Phase 10) — not as a bolt-on students have to claim
  - **Point values differ by event category**, matching the spec exactly: hackathon check-in = 20pts, workshop = 5pts, everything else = 10pts (generic participation), certificate = 10pts — all admin-configurable via `PUT /leaderboard/rules/:action`, not hardcoded
  - A new `MANAGE_LEADERBOARD` permission was added to the enum for this (schema change, same caveat as always — needs `prisma migrate` on a real DB, can't run in this sandbox)
  - **`awardPoints()` is the single entry point every trigger goes through** — QR check-in, certificate issuance, and manual staff awards (for WIN/VOLUNTEER, which have no automatic trigger since no winner-tracking or volunteer-hours module exists yet) — so the idempotency guard only has to exist in one place instead of being reimplemented per caller
  - **Idempotent by (userId, eventId, action)**: re-running the same award never duplicates points for the same student+event+reason, while a student can still legitimately earn *both* participation points and certificate points for the same event, since those are different actions — the dedup key is precise, not overly broad
  - Frontend: a public leaderboard page (podium for top 3, ranked list below) with a personal standing card when logged in, and a staff settings page for adjusting point values and manually awarding WIN/VOLUNTEER points
  - **8 assertions run against an in-memory fake DB**, most importantly proving idempotency directly: awarding hackathon check-in points twice for the same student+event does not create a duplicate ledger entry, while awarding certificate points for that same event *does* still go through (different action, same event) — the dedup logic isn't "one award per event," it's precisely "one award per (event, action)"
- ✅ Seed script: permission matrix + Super Admin + demo club members across 2025/2026 with different teams + sample student + leaderboard point rules
- ✅ **React frontend (Vite + Tailwind), fully wired to the backend above:**
  - Circuit-trace / PCB-copper design system (see "Design system" below) — not a template default
  - Axios client with in-memory access tokens + automatic refresh-on-401, `AuthContext` session bootstrap from the HTTP-only cookie
  - Register → OTP verification → Login → Forgot/Reset Password, all real forms (react-hook-form + Zod) validated to match the backend contracts exactly
  - Home page with live stats and upcoming-events preview pulled from the real API; Events listing with filters/pagination; Event details page
  - **Event details page has a fully working Register / Join Waitlist / Cancel flow**, reflecting real registration state (confirmed / waitlisted / not registered) per event
  - **Dashboard "My registrations"** pulls real data: upcoming registrations, waitlist position, cancel action — no mock data left in this flow
  - Protected routes, role-aware student dashboard skeleton
  - Verified with an actual `npm run build` — zero errors, zero warnings

## Verification

**Phase 20 update:** everything below this note describes tests that were run once,
ad hoc, during the session that built each phase, then deleted — useful evidence at
the time, but not something that protects against a future regression. As of Phase 20,
the highest-value subset of those tests has been converted into a permanent suite at
`server/__tests__/` (67 tests across 11 files, `npm test` to run). That suite is real
and passing right now — see "The permanent test suite" below for what it actually
covers and how it differs from what's described elsewhere in this section.

This isn't "written and assumed correct" — here's what was actually run, this session:

- `node --check` on every backend file (catches syntax errors)
- Full frontend `npm install` + `npm run build` — caught and fixed a real relative-import bug and cleaned up dead dynamic imports
- Backend Express app + all five route modules (`auth`, `events`, `registrations`, `payments`, `attendance`) mounted against a mocked DB layer to confirm route wiring doesn't throw at startup — this caught a real bug: `event.validator.js` called `.partial()` on a Zod schema that had already been `.refine()`d, which doesn't exist on `ZodEffects`. Fixed by deriving the update schema from the plain object shape before refining the create schema.
- **Registration business logic executed against an in-memory fake Prisma client** (duplicate prevention, capacity-triggered waitlisting, waitlist position tracking, and automatic promotion-on-cancellation) — all 6 assertions passed on a real run, not a code-review guess
- **Payment signature verification executed against real HMAC-SHA256 crypto**, covering: a legitimate signature verifying correctly, a forged signature being rejected, a signature signed with the wrong secret key being rejected, a signature replay against a different `orderId` being rejected, and a malformed/empty signature being handled without crashing the request — all 5 passed
- **Attendance check-in logic executed against an in-memory fake DB**, covering: a valid check-in marking `PRESENT` and setting certificate eligibility, a duplicate check-in being rejected, a cancelled registration being rejected, a QR token scanned at the wrong event being rejected, and an unrecognized token being rejected — all 5 passed
- **The certificate PDF was rendered end-to-end and visually inspected** (`pdftoppm` → PNG → viewed), not just generated and assumed correct — the first render was missing the Technical Team signature the spec requires and had a signature line overlapping the QR code; both were fixed and the corrected layout re-rendered and re-inspected before shipping
- **Certificate generation business logic executed against an in-memory fake DB**: only eligible + un-issued registrants get certificates, non-attendees are excluded at the query level, and a simulated retry-after-partial-failure (cert exists, status wasn't updated) correctly skips rather than duplicates — the first version of this test actually had an incorrect assumption baked in (conflating "already ISSUED" with "cert exists but status stuck at ELIGIBLE"), caught by the test failing, not by re-reading the code
- The frontend `npm run build` step caught two more real relative-import path bugs (`CheckInScanner.jsx` needed `../../services/...` since `pages/admin/` sits one level deeper than `pages/`) — every one of these was a genuine bug that would have broken the app at runtime, not a style nit
- **Club member service tested against an in-memory fake DB, 7 assertions**: rejecting a member add for an unregistered email, hiding contact/CV info from the public listing when `showContact` is false, **the CV route independently rejecting a non-owner/non-staff request by member ID** (the actual security boundary, not just a hidden link), the member's own account still being able to fetch their own CV, duplicate membership-per-year rejection, one year's roster staying untouched when a different year gets a new member, and soft-removal preserving the underlying record while excluding it from that year's public listing
- Along the way, fixed a real bug caught only by checking the schema directly: the service's first draft tried to write `profileImageUrl` onto the `ClubMember` model, but that field only exists on `User` — caught before it ever hit a runtime error, by cross-checking `prisma/schema.prisma` rather than assuming the field existed
- Also caught a genuine access-control gap while wiring the routes: the CV download route initially had no auth requirement at all, meaning the `showContact` gate would have only hidden the link in API responses — not actually blocked direct access by member ID. Fixed by requiring authentication on that route and moving the check into the service itself
- **Month-bucketing logic for the registrations-per-month chart tested against an in-memory fake DB, 5 assertions**: correct bucket count for the requested window, registrations outside the window excluded, correct per-bucket counts for both the most-recent and oldest months, and zero-registration months still appearing as zero-count buckets rather than silently disappearing (a gapped x-axis on a real chart is a genuine bug, not a cosmetic issue)
- The admin dashboard's `npm run build` first came back with a chunk-size warning — an 816KB main bundle, mostly `recharts`. Rather than ignore it, converted all `/admin/*` routes to `React.lazy` + `Suspense` and rebuilt: main bundle dropped to 394KB, with the chart-heavy admin chunk (405KB) only loading for staff who actually visit `/admin`. Confirmed by comparing the actual before/after build output, not assumed from the code change alone
- **Announcement `publishedAt` state-transition logic tested against an in-memory fake DB, 5 assertions**: draft creation leaves `publishedAt` null, immediate publish sets it, later publish of an existing draft sets it, and — the assertion that actually matters — **editing an already-published announcement (status still PUBLISHED) does not reset `publishedAt`**, which would otherwise silently reorder the homepage every time someone fixed a typo
- Caught a real UX/access gap while wiring the Manage Announcements link: `CONTENT_TEAM` has `MANAGE_ANNOUNCEMENTS` permission but not `VIEW_ANALYTICS`, so they can reach `/admin/announcements` directly but can't reach it *through* `/admin` (which requires `VIEW_ANALYTICS`). The link was almost only added to `AdminHome`, which Content Team would never see. Added it to the student Dashboard's quick links instead, where they actually land after logging in
- **Reminder idempotency tested against an in-memory fake DB, 4 assertions**: the correct reminder tier fires based on actual time-until-event (not every tier whose threshold happens to be larger), events too far out trigger nothing, **running the entire sweep twice in a row produces zero duplicate notifications** (the core guarantee this module exists to provide), and as an event gets closer additional tiers fire without disturbing the ones already sent. A 5th assertion covers event-cancellation notices only reaching still-active registrants, not ones already cancelled
- The first version of the reminder threshold logic had a genuine bug caught by the test, not by review: `hoursUntilStart <= window.hoursBefore` fires true for every tier whose threshold is larger than the actual remaining time, so an event created only 20 hours out would trigger both the 1-day reminder *and* a nonsensical "reminder: in 7 days" message in the same sweep. Fixed by giving each tier an explicit lower and upper band instead of an open-ended "less than" check
- **Recruitment service tested against an in-memory fake DB, 7 assertions**, most importantly proving the resume access boundary directly: staff can fetch any resume, the applicant can fetch their own, and — the check that would actually catch a real vulnerability — a random logged-in student is rejected with a 403 even when they know the exact application ID. Also verified: userId correctly links for logged-in applicants, anonymous applications are still accepted, status updates persist, and staff filtering by status returns the right subset
- **Feedback eligibility route fallthrough verified with actual HTTP requests against a running server**, not just reasoned about: spun up the app on an ephemeral port and confirmed `GET /api/events/:slug` and `GET /api/events/:slug/feedback/summary` both resolve to the correct handler
- **Feedback service tested against an in-memory fake DB, 6 assertions**: no registration → rejected, **registered-but-never-checked-in → rejected** (the distinction that actually matters — being registered isn't the same as having attended), attended → accepted, duplicate submission → rejected, public summary aggregates correctly and excludes comments, staff view includes them
- Caught a real frontend correctness bug before shipping: the first draft gated the feedback form on `registration.status === 'CONFIRMED'`, which would have shown the form to no-shows only for them to hit a confusing rejection on submit. Fixed by threading the actual `attendanceStatus` through from the registrations lookup instead of assuming confirmed-implies-attended
- **Leaderboard idempotency tested against an in-memory fake DB, 8 assertions**: point values correctly differ by event category (hackathon 20 / workshop 5 / generic 10), re-awarding the same student+event+action produces zero duplicate ledger entries (the core guarantee), a *different* action (certificate points) for the same event still awards correctly since the dedup key is `(event, action)` not just `(event)`, manual awards with no event ID are allowed to recur, and the public leaderboard ranking agrees exactly with a student's own "my rank" lookup

What's *not* verified here: actual Postgres queries, since this sandbox's network allowlist doesn't include `binaries.prisma.sh`, so `prisma generate`/`migrate` can't fetch engine binaries. That step is untouched by this limitation on your machine — `npx prisma generate` works normally outside this sandbox.

## The permanent test suite

```bash
cd server
npm install
npm test
```

`server/__tests__/` — 67 tests across 11 files, running in under 2 seconds, no
database required. This is genuinely different from the "run once, delete"
pattern described above:

- **`unit/`** (9 files) — service-level tests using Jest's `jest.mock('../../config/db', () => mockPrisma)`,
  with a small in-memory fake object per file replacing `@prisma/client`. This is the
  same in-memory-fake technique used throughout this build's development, just
  formalized with proper `beforeEach` isolation and `expect()` assertions instead of
  hand-rolled `assert` + `console.log`. Covers: registration idempotency/waitlist,
  payment signature verification (forgery, wrong-secret, replay attacks), attendance
  check-in, certificate generation eligibility, feedback attendance-gating, leaderboard
  point-awarding idempotency, **club member CV privacy** (including the exact
  access-control boundary — a random student rejected by the route itself, not just a
  hidden link), **recruitment resume privacy** (same pattern), and announcement
  `publishedAt` state transitions.
- **`integration/authorization.test.js`** — the one file that doesn't mock the
  Express app or middleware, only the database. Spins up the *real* `app.js` with real
  `protect`/`requirePermission` middleware and issues real HTTP requests via
  `supertest`, with real JWTs signed for different roles. This is what actually proves
  spec section 65's "student cannot create an event" and "unauthorized users cannot
  edit members" requirements as end-to-end HTTP behavior — a service-level test can
  only prove the service enforces a rule, not that the route wiring actually gets a
  request there in the first place.
- **Manual mocks**: `utils/__mocks__/email.util.js` auto-silences every `sendMail`
  call across the suite via Jest's manual-mock convention, so no test accidentally
  tries to hit real SMTP.

What this suite deliberately does **not** attempt: real Postgres integration tests.
That would need a test database (Docker Compose + `prisma migrate` against it), which
hits the same `binaries.prisma.sh` network wall as everything else in this sandbox.
The `jest.mock`-based approach here is a reasonable permanent substitute for unit-level
coverage, but a full integration suite against real Postgres remains real, unclaimed
future work — noted honestly rather than glossed over.

## Security hardening (Phase 19)

This was a deliberate adversarial pass over the codebase — grepping for gaps rather
than assuming everything built across 18 prior phases was airtight. Five real issues
were found and fixed, each backed by new tests in the permanent suite above:

1. **`AuditLog` had been unused since Phase 1** despite spec section 61 explicitly
   requiring admin-action logging. Added `utils/auditLog.util.js`, wired it into
   event create/update/delete, member add/update/remove, certificate generation, and
   role changes, plus `GET /audit-logs` (Super Admin only) to actually view it.
   **While wiring this in, the permanent test suite caught a real bug in the fix
   itself**: because `logAction()` is called fire-and-forget (never awaited, by
   design — audit logging shouldn't block the real action), an unhandled promise
   rejection from a synchronous property-access error would have propagated as an
   unhandled rejection, which **crashes the Node process by default on Node 15+**.
   Fixed with a proper `try/catch` inside the async function. This was caught by a
   test failing, not anticipated in advance.
2. **No role-assignment endpoint existed at all**, despite `MANAGE_ROLES` being a
   defined permission since Phase 1 — there was no way to promote a student to staff
   through the app itself, only via the seed script or a direct DB edit. Added
   `PUT /users/:id/role` (Super Admin only), enforcing spec business rule #12
   ("users cannot change their own role") even for Super Admins themselves — tested
   directly, including the case where a Super Admin tries to change their own role.
3. **JWT verification wasn't pinning its algorithm.** Checked whether this was a
   live exploit before "fixing" it: crafted an actual forged `alg:none` token and
   attempted to verify it both before and after the change. The library already
   rejected it by default in this version — so this was legitimate defense-in-depth
   against future library/config drift, not a fix for a live vulnerability, and is
   reported as such rather than oversold.
4. **A real TOCTOU race condition in event registration.** The capacity check
   (`count()`) and the seat-confirming write (`upsert()`) were two separate,
   non-atomic operations — two concurrent requests for the last seat could both read
   "seat available" before either wrote, overbooking the event. Fixed by wrapping
   both in a Postgres Serializable transaction with retry-on-conflict (Prisma error
   `P2034`). **Honestly scoped test coverage**: the retry *mechanism* itself is
   tested directly (a conflict triggers a retry, repeated conflicts exhaust the
   retry limit, non-conflict errors are never retried) — but true concurrent-request
   behavior against a real database can't be tested in this sandbox, the same
   network limitation noted throughout this README.
5. **No rate limiting on the public recruitment application form** beyond the
   general 100-req/15min API limiter — too permissive for an anonymous,
   unauthenticated write endpoint. Added a dedicated 5-req/15min limiter.

Frontend: Super Admin now has `/admin/roles` (search + reassign) and `/admin/audit-log`
(browse logged actions) — closing the loop so these backend capabilities are actually
usable, not just API endpoints nobody can reach.


## What's not yet built

Every feature-level module the spec calls for is now built (see the
Roadmap at the bottom for the exact list). What remains is the "final
polish" phases: a deeper analytics pass, a formal security-hardening
review, an actual Jest/Supertest test suite (this README's Verification
section documents tests that were run and then deleted — a real,
permanent `__tests__/` directory is a separate, larger undertaking), and
deployment tooling (Docker, CI). None of these are unfinished features so
much as unfinished *rigor* on top of a feature-complete app.

---

## Getting started

```bash
# 1. Backend
cd server
npm install
cp ../.env.example .env
# fill in DATABASE_URL, JWT secrets, SMTP creds, Turnstile secret, etc.
npx prisma migrate dev --name init
npm run seed
npm run dev   # http://localhost:5000

# 2. Frontend (separate terminal)
cd client
npm install
cp .env.example .env
# optionally set VITE_TURNSTILE_SITE_KEY for a real captcha widget
npm run dev   # http://localhost:5173 (proxies /api to :5000)
```

Demo login (after seeding), password for all seeded accounts is `Passw0rd!`:
- `superadmin@codecraftersclub.com` — SUPER_ADMIN
- `tech2026@codecraftersclub.com` — TECHNICAL_TEAM (2026)
- `student@example.com` — STUDENT

Run the backend test suite any time with `cd server && npm test` — no database
needed, runs in under 2 seconds. See "The permanent test suite" further down for
what it covers.

## Deployment (Phase 21)

### Quick start with Docker Compose

```bash
cp .env.example .env
# fill in DATABASE_URL is generated automatically by compose — you only
# need JWT secrets, SMTP credentials, and optionally Razorpay/Cloudinary/Turnstile

docker compose up --build
```

This brings up three containers: `postgres` (16-alpine, persisted via a named
volume), `server` (the API, built from `server/Dockerfile`), and `client` (the
React app built and served as static files through nginx, which also reverse-proxies
`/api/*` to the `server` container). Visit `http://localhost`.

**First-time database setup** — since this project's Prisma schema has never had
`prisma migrate dev` run against it (the sandbox this was built in can't reach
`binaries.prisma.sh` to fetch migration-engine binaries — see "Verification"
above), there's no `prisma/migrations/` history yet. Two options:

```bash
# Option A — quick sync, no migration history (fine for a first deploy):
docker compose exec server npx prisma db push

# Option B — proper migration history, do this ONCE from a machine with
# normal internet access, then commit the generated prisma/migrations/
# folder so `prisma migrate deploy` works in every future deploy:
npx prisma migrate dev --name init   # run locally, not in the container
git add prisma/migrations && git commit -m "Add initial migration"
```

Then seed demo data:
```bash
docker compose exec server npm run seed
```

### ⚠️ HTTPS is required in production, not optional

The refresh-token cookie is set with `secure: true` whenever `NODE_ENV=production`
(`server/controllers/auth.controller.js`) — and the `docker-compose.yml` here sets
exactly that. **A `Secure` cookie is silently dropped by every browser over plain
HTTP.** Running this compose file as-is (plain HTTP on port 80) means login will
*appear* to work — the access token still comes back in the response body — but the
refresh flow will silently fail, and sessions won't survive a page reload.

For real production use, put a TLS-terminating reverse proxy in front of the
`client` container — Caddy (automatic Let's Encrypt, simplest option), Traefik, or
your hosting platform's built-in HTTPS (Render, Railway, Fly.io, and most PaaS
options handle this for you automatically). This compose file intentionally stays
HTTP-only so it's simple to run locally; TLS termination is left to whatever your
actual hosting environment provides.

### Required environment variables

See `.env.example` at the repo root for the full list with comments. At minimum for
a working deployment: `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`,
`SMTP_HOST`/`SMTP_USER`/`SMTP_PASSWORD` (OTP emails won't send without these —
registration will still work, but users can't verify their account). Optional but
feature-gating if omitted: `RAZORPAY_KEY_ID`/`SECRET` (paid events fail cleanly
with a clear error otherwise — see Phase 8), `TURNSTILE_SECRET_KEY` (falls back to
a labeled dev captcha placeholder — see `CaptchaField.jsx`), `CLOUDINARY_*` (unused
by the current code — see storage note below).

### File storage in production

Certificates, member CVs/photos, and recruitment resumes are currently written to
local disk (`server/storage/`, gitignored) — see the architecture notes in each
relevant service (`certificate.service.js`, `member.service.js`,
`recruitment.service.js`). The Docker setup mounts a named volume
(`server_storage`) over this path so uploads survive container restarts and
redeploys, which is sufficient for a single-server deployment. If you scale to
multiple server instances behind a load balancer, local disk storage breaks
(instance A can't serve a file instance B saved) — at that point, swap the
`local:` file-marker convention used throughout for a real object-storage adapter
(Cloudinary env vars are already scaffolded in `.env.example` for exactly this).

### Alternative: PaaS deployment (no Docker)

Render, Railway, and Fly.io all support deploying directly from a GitHub repo
without writing your own Dockerfiles (though the ones in this repo work fine there
too, if you prefer explicit control). Typical setup: a managed Postgres add-on for
`DATABASE_URL`, a web service pointed at `server/` (build command `npm install &&
npx prisma generate`, start command `npm start`), and a static site pointed at
`client/` (build command `npm install && npm run build`, publish directory
`client/dist`) with a rewrite rule for SPA routing (all of these platforms support
"redirect all to index.html" natively — equivalent to the `try_files` fallback in
`client/nginx.conf`). These platforms provide HTTPS automatically, which resolves
the cookie issue above without needing your own reverse proxy.

### Known dependency vulnerabilities (found, not silently ignored)

While dry-running the server Dockerfile's `deps` stage (`npm ci --omit=dev`) to
verify it actually works — not just assumed from the Dockerfile text — `npm audit`
surfaced 6 real transitive-dependency vulnerabilities: **nodemailer** (high —
several SMTP injection/SSRF advisories), **tar** via `bcrypt`'s native-module
installer `@mapbox/node-pre-gyp` (critical — path traversal/arbitrary file write),
and **uuid** via `node-cron` (moderate). None have a fix available without a
`--force` major-version bump (`bcrypt` v5→v6 changes its native bindings; `node-cron`
v3→v4 is a breaking API change) — and this sandbox's network restrictions mean a
native-module rebuild + full re-test of the permanent suite against the new version
can't be verified end-to-end here. **This is flagged as genuine follow-up work,
not fixed blindly**: before a real production deploy, run `npm audit` in `server/`,
review the `--force` fix's breaking changes against how `bcrypt` and `node-cron`
are actually used in this codebase, and re-run the full test suite after upgrading.

### Health checks & CI

`GET /api/health` (no auth) returns `{ success: true }` — both the Docker
`HEALTHCHECK` directives and most PaaS platforms' built-in health monitoring can
point at this directly. `.github/workflows/ci.yml` runs on every push/PR: the
permanent backend test suite (`npm test`, no database required — same reason it
runs in under 2 seconds locally), a frontend production build, and a Prisma schema
validation step (which, unlike this sandbox, GitHub Actions runners *can* actually
reach `binaries.prisma.sh` for).

## Design system

Built to avoid the generic AI-template looks (cream+serif+terracotta,
black+single-neon-accent, broadsheet hairlines). Since this is an ENTC
(electronics) club, the visual language is drawn from PCB/circuit imagery
instead:

- **Palette:** `#0A0E17` deep blue-black base ("PCB substrate"), `#E8A33D`
  copper (primary accent — literal PCB trace color), `#5B7FFF` signal blue
  (secondary/interactive), `#2DD4BF` active teal (status indicator)
- **Type:** Space Grotesk (display, technical geometric feel), Inter (body),
  JetBrains Mono (event IDs, certificate codes, stat readouts, terminal-style
  UI chrome)
- **Signature element:** an animated copper "circuit trace" SVG that draws
  itself between sections — literalizing the club's identity (code +
  circuits) rather than decorating for its own sake
- All interactive elements have visible focus rings; `prefers-reduced-motion`
  disables the trace-draw and pulse animations

### Auth API quick reference

| Method | Endpoint | Auth | Notes |
|---|---|---|---|
| POST | `/api/auth/register` | – | rate-limited |
| POST | `/api/auth/verify-otp` | – | |
| POST | `/api/auth/resend-otp` | – | 1/min cooldown |
| POST | `/api/auth/login` | – | sets refresh cookie |
| POST | `/api/auth/forgot-password` | – | |
| POST | `/api/auth/reset-password` | – | revokes all sessions |
| POST | `/api/auth/refresh-token` | cookie | rotates refresh token |
| POST | `/api/auth/logout` | cookie | |
| GET | `/api/auth/me` | Bearer token | |

### Events API quick reference

| Method | Endpoint | Auth | Notes |
|---|---|---|---|
| GET | `/api/events` | optional | filters: `category`, `mode`, `search`, `year`, `upcoming`, `page`, `limit` |
| GET | `/api/events/stats/summary` | – | powers the homepage stats panel |
| GET | `/api/events/:slug` | optional | drafts only visible to staff |
| POST | `/api/events` | Bearer + `CREATE_EVENT` | Technical Team / Super Admin |
| PUT | `/api/events/:id` | Bearer + `EDIT_EVENT` | |
| DELETE | `/api/events/:id` | Bearer + `DELETE_EVENT` | cancels instead of hard-deleting if there are confirmed registrations |

### Registration API quick reference

| Method | Endpoint | Auth | Notes |
|---|---|---|---|
| POST | `/api/events/:slug/register` | Bearer + verified email | confirms if seats available, else waitlists |
| DELETE | `/api/events/:slug/register` | Bearer | cancels; auto-promotes next waitlisted student |
| GET | `/api/registrations/me` | Bearer | student's own registrations + waitlist entries |
| GET | `/api/events/:eventId/registrations` | Bearer + `MANAGE_REGISTRATIONS` | staff view of all registrants for an event |

### Payment API quick reference

| Method | Endpoint | Auth | Notes |
|---|---|---|---|
| POST | `/api/payments/create-order` | Bearer + verified email | body: `{ eventSlug }` — returns Razorpay order + checkout key |
| POST | `/api/payments/verify` | Bearer | body: `{ orderId, paymentId, signature }` — the ONLY thing that confirms a paid registration |

### Attendance API quick reference

| Method | Endpoint | Auth | Notes |
|---|---|---|---|
| POST | `/api/events/:eventId/checkin` | Bearer + `MANAGE_ATTENDANCE` | body: `{ qrToken }` — marks `PRESENT`, sets certificate eligibility |
| GET | `/api/events/:eventId/checkin/summary` | Bearer + `MANAGE_ATTENDANCE` | live present/absent counts |

### Certificate API quick reference

| Method | Endpoint | Auth | Notes |
|---|---|---|---|
| POST | `/api/events/:eventId/certificates/generate` | Bearer + `GENERATE_CERTIFICATE` | bulk-issues for everyone marked `ELIGIBLE`; skips already-issued |
| GET | `/api/certificates/me` | Bearer | student's own certificate list |
| GET | `/api/certificates/:code/download` | Bearer (owner or staff) | streams the PDF |
| GET | `/api/certificates/verify/:code` | – | public; returns name/event/date only, never contact info |

### Members API quick reference

| Method | Endpoint | Auth | Notes |
|---|---|---|---|
| GET | `/api/members/years` | – | list of years with a roster, for the year selector |
| GET | `/api/members/year/:year` | – | public roster; contact info/CV only included if `showContact` |
| GET | `/api/members/:id/photo` | – | public profile photo |
| GET | `/api/members/:id/cv` | Bearer (owner, staff, or `showContact`) | the real access-control boundary — not just hidden from listings |
| POST | `/api/members` | Bearer + `MANAGE_MEMBERS` | multipart; adds a *registered* student to a year's roster |
| PUT | `/api/members/:id` | Bearer + `MANAGE_MEMBERS` | multipart; update fields and/or replace files |
| DELETE | `/api/members/:id` | Bearer + `MANAGE_MEMBERS` | soft-removes from that year only (`leftAt`), never deletes history |

### Analytics API quick reference

| Method | Endpoint | Auth | Notes |
|---|---|---|---|
| GET | `/api/analytics/overview` | Bearer + `VIEW_ANALYTICS` | headline stat card values |
| GET | `/api/analytics/registrations-by-month` | Bearer + `VIEW_ANALYTICS` | `?months=6` (default), zero-filled |
| GET | `/api/analytics/events-by-category` | Bearer + `VIEW_ANALYTICS` | pie chart data |
| GET | `/api/analytics/revenue-by-event` | Bearer + `VIEW_ANALYTICS` | top 10 by revenue |
| GET | `/api/analytics/students-by-graduation-year` | Bearer + `VIEW_ANALYTICS` | bar chart data |

### Announcements API quick reference

| Method | Endpoint | Auth | Notes |
|---|---|---|---|
| GET | `/api/announcements` | – | public; PUBLISHED only; `?limit=3` for the homepage |
| GET | `/api/announcements/:id` | – | public; 404s if not PUBLISHED |
| GET | `/api/announcements-admin/all` | Bearer + `MANAGE_ANNOUNCEMENTS` | staff view including drafts |
| POST | `/api/announcements` | Bearer + `MANAGE_ANNOUNCEMENTS` | `publishedAt` set only if status is PUBLISHED |
| PUT | `/api/announcements/:id` | Bearer + `MANAGE_ANNOUNCEMENTS` | `publishedAt` set once, never reset on re-edit |
| DELETE | `/api/announcements/:id` | Bearer + `MANAGE_ANNOUNCEMENTS` | |

### Notifications API quick reference

| Method | Endpoint | Auth | Notes |
|---|---|---|---|
| GET | `/api/notifications/me` | Bearer | `?unreadOnly=true` to filter |
| PUT | `/api/notifications/:id/read` | Bearer | marks a single notification read |
| PUT | `/api/notifications/read-all` | Bearer | marks all of the caller's notifications read |

Reminders and cancellation notices aren't triggered via API — they're produced by
`jobs/reminder.job.js` (cron, every 15 min) and `event.service.js`'s cancellation
path respectively, both writing through `notification.service.js`.

### Recruitment API quick reference

| Method | Endpoint | Auth | Notes |
|---|---|---|---|
| POST | `/api/recruitment` | optional | public; multipart; accepts logged-in or anonymous applicants |
| GET | `/api/recruitment/:id/resume` | Bearer (self or staff) | not permission-gated at the route level — see architecture notes |
| GET | `/api/recruitment` | Bearer + `MANAGE_RECRUITMENT` | `?status=&team=&page=` |
| GET | `/api/recruitment/:id` | Bearer + `MANAGE_RECRUITMENT` | full application detail |
| PUT | `/api/recruitment/:id/status` | Bearer + `MANAGE_RECRUITMENT` | triggers a status-update email |

### Feedback API quick reference

| Method | Endpoint | Auth | Notes |
|---|---|---|---|
| GET | `/api/events/:slug/feedback/summary` | – | public; aggregate averages only, never comments |
| POST | `/api/events/:slug/feedback` | Bearer | requires `attendanceStatus === 'PRESENT'`, not just registration |
| GET | `/api/events/:slug/feedback/me` | Bearer | for the frontend to know if the caller already submitted |
| GET | `/api/events/:eventId/feedback` | Bearer + `VIEW_ANALYTICS` | full detail including comments/suggestions |

### Leaderboard API quick reference

| Method | Endpoint | Auth | Notes |
|---|---|---|---|
| GET | `/api/leaderboard/top` | – | public; `?limit=20` (default) |
| GET | `/api/leaderboard/rules` | – | public; current point values per action |
| GET | `/api/leaderboard/me` | Bearer | caller's total points + rank |
| PUT | `/api/leaderboard/rules/:action` | Bearer + `MANAGE_LEADERBOARD` | admin-configurable point values |
| POST | `/api/leaderboard/award` | Bearer + `MANAGE_LEADERBOARD` | manual award for WIN/VOLUNTEER (no auto-trigger exists for these yet) |

Participation and certificate points are never awarded via this API directly —
they're triggered internally by `attendance.service.js` (on check-in) and
`certificate.service.js` (on issuance), both calling through
`leaderboard.service.js`'s `awardPoints()`.

### Users & audit log API quick reference (Phase 19)

| Method | Endpoint | Auth | Notes |
|---|---|---|---|
| GET | `/api/users` | Bearer + `MANAGE_ROLES` (Super Admin) | `?q=` searches name/email |
| PUT | `/api/users/:id/role` | Bearer + `MANAGE_ROLES` (Super Admin) | rejects self-role-change with 403, even for the acting Super Admin |
| GET | `/api/audit-logs` | Bearer + `VIEW_AUDIT_LOG` (Super Admin) | `?entity=&page=` |

---

## Architecture decisions worth knowing about

- **Permissions, not hardcoded roles.** Routes declare `requirePermission('CREATE_EVENT')`,
  not `if (role === 'TECHNICAL_TEAM')`. The mapping lives in `config/permissions.js` and is
  also seeded into the DB (`RolePermission` table) so a Super Admin can eventually reconfigure
  team capabilities without a redeploy.
- **Club membership is year-scoped, never overwritten.** `ClubYear` → `ClubMember` means 2025's
  roster and 2026's roster are separate rows. Selecting a year in the UI is just a `WHERE clubYearId = ?`
  filter — nothing is ever destructively updated when a new year starts.
- **Money uses `Decimal`, not `Float`**, in the `Payment` and `Event.registrationFee` columns —
  avoids floating-point rounding bugs in financial reconciliation.
- **Payment status is never trusted from the frontend.** The `Payment` table only reaches
  `PAID` after the backend verifies the Razorpay signature server-side — implemented in
  `utils/razorpay.util.js` using `crypto.createHmac` + `crypto.timingSafeEqual`, tested against
  forged-signature and signature-replay scenarios (see Verification). The Razorpay Checkout
  script itself is loaded dynamically client-side (`utils/loadRazorpay.js`) rather than
  hardcoded into `index.html`, so pages that don't need payments don't pay the script cost.
- **Refresh tokens are stateful, access tokens are stateless.** Access JWTs can't be revoked
  early, so they're short-lived (15 min). Refresh tokens are hashed and stored in the DB so
  logout / password reset / suspicious activity can kill a session immediately.
- **OTPs are hashed like passwords**, never stored or logged in plaintext, and capped at 5
  attempts before requiring a fresh one.
- **Privacy gates are enforced at the data layer, not just hidden in the UI.** A member's
  email/phone/CV only appear in `GET /members/year/:year` when they've opted in via
  `showContact`, but the CV *download route* independently re-checks that flag (plus
  owner/staff bypass) server-side — so knowing a member's ID directly can't bypass what
  the listing already hid. This is the same principle as payment verification: never trust
  that hiding something from a response is the same as protecting it.
- **"Staff or self" access checks belong in the service, not the route's permission gate.**
  The recruitment resume route only requires `protect` (any logged-in user), not
  `MANAGE_RECRUITMENT` — because an applicant should be able to view their own submitted
  resume, and a permission-gated route would have blocked that legitimate case along with
  the illegitimate ones. The staff-or-owner decision happens inside
  `recruitment.service.js`, the same pattern used for club member CVs.

---

## Roadmap — how we build the rest

Following spec section 68/71, each phase below gets: DB migration (already
covered by the schema) → service → controller → routes → validators →
frontend service + UI → loading/error states, before moving to the next.

| Phase | Module |
|---|---|
| 18 | Analytics deep-dive |

Every feature-level module the spec calls for is built, the core business
logic has a permanent, passing test suite (78 tests, see "The permanent
test suite" above), a genuine adversarial security pass has been done
(see "Security hardening" above), and the app is now containerized with a
working CI pipeline and hosting documentation (see "Deployment" above) —
including honest documentation of what couldn't be verified in this
sandbox (real `docker build`/`docker compose up` execution, and a
dependency-vulnerability fix requiring a native-module rebuild). The only
phase left on the original roadmap is **Phase 18 (a deeper analytics
pass)** — genuinely the lowest-priority item remaining, since the admin
dashboard built in Phase 12 already covers every analytics requirement
the spec explicitly calls for (registrations/month, revenue by event,
category breakdown, students by graduation year). At this point the
project has no unbuilt features, a real test suite, a documented security
posture, and a real deployment path — further work from here is
refinement and maintenance rather than new construction.
