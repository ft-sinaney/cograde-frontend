# CoGrade — Frontend

AI evaluation assistant for educators. Next.js 14 (App Router) + React 18 +
TypeScript + Tailwind CSS, talking to the real [CoGrade FastAPI
backend](../cograde-backend) — no mock data left in the app.

- **Night 1:** all 9 designed screens built and wired into a working
  click-through flow, entirely on local mock data (`lib/mock-data.ts`), no
  backend involved.
- **Night 6:** the frontend now talks to the real backend (built Nights
  2-5) for every screen — real JWT auth, real file uploads, real grading,
  real analytics, real audit trail. `lib/mock-data.ts` is deleted. See
  "Night 6: what actually changed" below for the full picture, including
  two new pages the Night 1 mockup never had (`/login`, `/exams`) that
  turned out to be required, not optional, once there was a real
  multi-tenant backend behind the UI.
- **Night 7 (this update):** final testing at production scale, a real
  theme-persistence bug found and fixed, responsive/mobile checks (real
  device emulation, not just a resize), and production-deployment prep
  (Vercel is zero-config for this app — see "Night 7" below for exactly
  what that means and what still needs a human to click "Deploy").

## Getting started

This app needs the backend running (see `../cograde-backend/README.md` —
PostgreSQL + `uvicorn app.main:app`). Once that's up on `:8000`:

```bash
npm install
cp .env.example .env.local   # only if .env.local isn't already there
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You'll land on
`/login` — there's no seeded account baked into the frontend, so register a
teacher account there (or use one `scripts/seed.py` created on the
backend), or use the demo account (`teacher@cograde.io` / `Demo@123`) —
run `python -m scripts.seed_demo` on the backend first if it doesn't exist
yet. See `../cograde-backend/DEMO.md` for the full demo script.

`.env.local` / `.env.example`:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

If unset, `lib/api.ts` falls back to `http://localhost:8000` anyway, so this
is only necessary when the backend runs somewhere else (a different port, a
deployed URL, etc).

For a production build (this is what was actually run to verify the app —
see "Testing" below):

```bash
npm run build
npm run start
```

## Pages

| Route | Screen |
| --- | --- |
| `/` | Homepage — marketing landing page (CTAs now point at `/login`) |
| `/login` | **New in Night 6.** Sign in / register (JWT) |
| `/exams` | **New in Night 6.** Exam picker + "New Exam" — every other page is scoped to whichever exam is selected here |
| `/upload-question` | Upload Question Paper (real PDF upload → extraction → rubric generation) |
| `/extracted-questions` | Extracted Questions & Rubric — edit questions/marks, review AI-generated concepts, approve |
| `/upload-answers` | Upload Answer Sheets (real multipart batch upload, roll-number auto-detection) |
| `/evaluating` | Evaluating — real grading call in flight, with a simulated progress animation (see limitations) |
| `/results` | Results Dashboard — real data, review-summary strip, Finalize action, CSV export |
| `/results/[id]` | Student Detailed Evaluation (4 tabs) + real marks-override / teacher-notes form |
| `/analytics` | Analytics & Reports — real KPIs, score distribution, question difficulty, grading consistency |
| `/students` | Student roster, from real results |
| `/audit-log` | **New in Night 6.** Full audit trail for the selected exam, filterable, CSV export |
| `/settings` | Account & preferences — theme is real (synced to the backend), the rest is local-only (see below) |

The **Full Answer Sheet** tab on the student detail page still renders the
"Answer Sheet View (AI Highlight)" mockup frame (`HandwritingSheet`) — the
backend doesn't store or serve a pixel-accurate scan of the original sheet,
so this remains a simulated rendering driven by the real per-question
concept-coverage data (`covered_concepts` / `missing_concepts`), not by mock
numbers.

## Night 6: what actually changed

**Every page now fetches from the real backend.** No component imports mock
data (`lib/mock-data.ts` is deleted). `lib/api.ts` is a single typed fetch
client covering all 24 backend endpoints, with JWT header injection,
centralized error typing, and a 401 handler that force-logs-out and redirects
to `/login`.

**Two pages that didn't exist on Night 1, because the backend requires them:**

- **`/login`** — the Night 1 mockup had no auth screen at all (it assumed an
  already-logged-in user). The backend requires a JWT bearer token on almost
  every endpoint, so this had to be built from scratch: combined login/
  register form, per-field validation errors, redirect-if-already-logged-in.
- **`/exams`** — the Night 1 mockup implicitly assumed one global exam. The
  backend scopes virtually everything (`questions`, `rubric`,
  `answer_sheets`, `results`, `analytics`, `audit_log`) to a specific
  `exam_id`, and a teacher can have many exams. This page (list + create)
  and a `examId` field threaded through `AppStoreProvider` is what makes
  every other page's API calls unambiguous. It also decides where a click
  into an exam lands you (`/upload-question` for a fresh exam,
  `/results` for a completed one, etc.), based on the exam's real status.

**Auth, exam selection and answer-file blobs are the only client-side state
left.** `lib/app-store.tsx` used to hold the entire mock dataset; now it only
holds what genuinely can't survive a page navigation any other way: the
selected `examId` (persisted to `localStorage` so it survives a refresh),
the in-flight `File` objects for the two upload steps, and the
questions/rubric being edited before they're PUT back to the server.
Everything else (results, analytics, audit log, students) is fetched fresh
by whichever page needs it.

**Error handling, matching the spec's Module 2 checklist:**
- Network failures retry up to 3 times with backoff (`withRetry` in
  `lib/api.ts`) — applied to the two multipart upload calls specifically,
  since those are the ones most likely to hit a flaky connection; a real
  4xx/5xx from the server is never retried.
- A 401 anywhere clears the token and redirects to `/login` via a callback
  registered from `AuthProvider` (a plain `.ts` module can't call
  `useRouter` itself).
- Field-level validation errors (the backend's `{detail, errors: [...]}` 422
  shape) render under the specific input on `/login` and the exam-creation
  form; the marks-override field on `/results/[id]` is validated
  client-side against the exam's total marks before it's ever sent.
- File uploads are checked client-side for extension, a 20MB size cap
  (mirroring the backend's real `MAX_UPLOAD_SIZE_MB`), and empty/0-byte
  files, before a request is even made.
- `/analytics` and `/audit-log` each fetch independently and degrade in
  isolation — either failing doesn't take down navigation or any other page.

## Testing

This was verified against a **live backend**, not just `tsc`/`next build`
(both of which also pass clean). Two Playwright scripts drove a real
Chromium browser through the running app on `localhost:3000` against a real
`uvicorn` + PostgreSQL backend on `localhost:8000`:

1. **Full happy path** (spec's Test Case 1): register → create exam →
   upload a question PDF → verify 4 extracted questions + rubric concepts →
   approve rubric → upload 10 answer sheets → verify roll-number detection
   (including one genuinely undetected roll number, auto-corrected OCR
   typos, and a low-confidence flag) → grade → results table (10/10 rows,
   review-summary tiles) → override a student's marks (plus a rejected
   out-of-range override) → review every flagged result → finalize the exam
   → analytics (real KPIs, question difficulty, CSV export) → audit log
   (14 real entries, action filter, CSV export) → students roster → theme
   toggle → logout → confirmed every protected route bounces back to
   `/login` once logged out.
2. **Error scenarios** (spec's Test Case 2): non-PDF question paper
   (blocked client-side), a `.pdf`-named file with garbage bytes (rejected
   by the server's real PDF parser, surfaced as a toast), a 0-byte file
   (blocked client-side), grading before a rubric is approved (backend
   error message surfaced with a Try Again action), and a zero-student CSV
   export (still downloads a valid, empty CSV rather than erroring).

Both runs passed with zero failures on the final pass. Two real bugs were
found and fixed this way (not by inspection — the browser genuinely hit
them):
- The **Finalize** button let you click it even when flagged results still
  needed review, sending a call that was always going to fail the backend's
  precondition (`review.py`'s `finalize_exam`). It's now disabled — with an
  inline explanation banner — until every flagged result has actually been
  reviewed, mirroring the backend's own rule exactly (`pending_review === 0`
  from `/review-summary`).
- Audit-log action badges ("Mark Overridden", "Batch Grading Run", etc.)
  wrapped onto two lines inside the pill — the shared `.badge` component had
  never rendered a multi-word label before Night 6. Fixed with
  `whitespace-nowrap` on the base class.

## Known limitations (backend gaps, not frontend bugs)

These are real constraints of the Night 2-5 backend that Night 6 works
around honestly rather than papering over:

- **No job-queue / progress-polling endpoint exists.** Batch grading is one
  synchronous backend call. `/evaluating` still shows the nice animated
  step-by-step progress from the Night 1 mockup, but it's cosmetic pacing
  (animates to ~92%, jumps to 100% on the real response) — clearly commented
  as such in `app/evaluating/page.tsx`. The spec's suggested `GET
  /api/exams/{id}/grading-progress` doesn't exist on the backend.
- **An undetected roll number can't be renamed from the UI.** When OCR
  can't read a roll number at all, the backend still creates a result row
  under a placeholder (`UNVERIFIED-<hex>`) so the sheet isn't silently
  dropped — flagged, with a clear reason, reviewable and gradeable like any
  other result. But there's no backend endpoint to correct the roll-number
  *text* itself (only marks/feedback, via the override endpoint), so that
  placeholder is permanent. Fixing this needs a new backend endpoint, which
  is out of scope for an integration-only night against an already-tested,
  already-delivered backend.
- **`teacher_override_marks` has no server-side upper bound** (only `>= 0`)
  — a teacher could in principle override with more than the exam's total
  marks and the backend would accept it. The frontend now guards this
  client-side (`/results/[id]` rejects an override above `total_marks`
  before sending it), but a non-browser client hitting the API directly
  still wouldn't be stopped.
- **Student `/results/[id]` detail has no dedicated backend endpoint** — it
  reuses the full `GET /results` list and finds the matching row by roll
  number client-side, since no `GET /results/by-roll/{roll}` exists.

## Night 7: final testing, a real bug fix, and deployment prep

Full context/spec in the backend README's own "Night 7" section (shared spec
covering both projects) — this section is the frontend-specific half.

### A real theme-persistence bug, found by testing, not inspection

Module 1's checklist explicitly calls out "theme toggle bugs → fix." Testing
it for real (toggle via the header icon → navigate to `/settings` → reload)
surfaced one:

- **The bug:** the header's quick theme toggle (`components/ThemeToggle.tsx`,
  present on every page) only ever wrote the chosen theme to `localStorage`.
  The Settings page's `useEffect` (`app/settings/page.tsx`) pulls the
  *server-saved* theme on every mount and overwrites the local theme if they
  differ — intended for "you signed in on a new device," but since the
  header toggle never told the server anything, the server's value went
  stale the moment someone used the header toggle instead of the Settings
  page's own buttons. Next visit to `/settings`: the theme silently flips
  back.
- **The fix** (`lib/theme-provider.tsx`): `applyTheme` now also does a
  best-effort `api.updateSettings(theme)` call whenever the theme actually
  changes, from *any* control — not just the Settings page's buttons — so
  the server is never stale regardless of which UI element the user used.
  Gated on `getToken()` being present, since `ThemeToggle` also renders on
  the public `/` and `/login` pages, where firing an authenticated request
  would 401 and (via `api.ts`'s `onUnauthorized` handler) redirect an
  anonymous visitor to `/login` just for switching themes — a regression
  this fix deliberately avoids introducing.
- **Verified fixed** with a real Playwright run: toggle via the header on
  `/settings` → reload → theme is still what was chosen (was reverting to
  the old value before the fix; the same script demonstrated the failure
  first, then confirmed the fix).

### Browser / responsive testing

This sandbox only has Chromium available — no Firefox, no Safari (Safari
doesn't run on Linux at all), so "Chrome (latest)" is genuinely covered by
every E2E/perf run in this session and in Night 6, and "Firefox/Safari"
honestly were not tested here. What *was* actually run:

- **Viewport sweep** (desktop 1440px, tablet 768px, mobile 375px) across
  `/exams`, `/results`, `/analytics`, `/audit-log`, `/settings` — checked
  `document.documentElement.scrollWidth` for horizontal overflow at each
  size. Zero overflow at any size on any page.
- **Real mobile device emulation** (Playwright's iPhone 13 profile — real
  mobile viewport, touch, user-agent, not just a resized desktop browser)
  through login and the results table. No overflow; core flows work.
- One minor, non-blocking cosmetic note: on a 375px-wide screen, the
  Topbar's title truncates aggressively (four action buttons plus a
  hamburger leave very little room) — e.g. "Evaluation Results" renders as
  "E…". It doesn't overflow or break the layout, just reads as very
  clipped; left as a known polish item rather than a rushed fix to a
  shared header component this late in testing.

### Production build / deployment readiness

- `npm run build` is clean (verified again this session, after the theme
  fix): zero TypeScript errors, zero build errors, all 16 routes prerender.
- Zero `console.log`/`console.debug` statements anywhere in `app/`, `lib/`,
  `components/` (grepped, not assumed) — nothing to strip before shipping.
- `NEXT_PUBLIC_API_URL` (`.env.example`) is the one thing that needs to
  point at the deployed backend URL in production — everything else in this
  app already reads from it (`lib/api.ts`'s `API_BASE`).
- **Vercel needs no extra config file for this app** — it's a standard
  Next.js App Router project, which Vercel auto-detects and builds with zero
  configuration beyond the one environment variable above. There's
  deliberately no `vercel.json` added — one isn't needed here, and adding
  one would just be a place for defaults to drift from Vercel's own.
- **What wasn't done, and why:** actually clicking "Deploy" on Vercel needs
  either the Vercel Claude connector connected in this chat (checked via
  `ListConnectors` — not connected) or a human doing it from the Vercel
  dashboard/CLI, since this sandbox's network policy blocks `vercel.com`
  outright (confirmed with `curl`: `403 CONNECT tunnel failed`). The steps
  once you're there: import this repo, set `NEXT_PUBLIC_API_URL` to the
  deployed backend's URL, deploy — no other configuration is needed.

## Project structure

```
app/                     Routes (App Router)
  layout.tsx              Root layout — Theme > Toast > Auth > AppStore providers
  page.tsx                Homepage
  globals.css             Design tokens (CSS variables) + Tailwind layers
  login/                  New in Night 6
  exams/                  New in Night 6
  upload-question/
  extracted-questions/
  upload-answers/
  evaluating/
  results/
    page.tsx               Results dashboard (+ review-summary + Finalize)
    [id]/page.tsx           Student detail (tabs) + override form
  analytics/
  students/
  audit-log/              New in Night 6
  settings/
components/
  AppShell.tsx             Sidebar + Topbar + auth/exam route guards
  Sidebar.tsx / Topbar.tsx / ThemeToggle.tsx
  icons.tsx                Hand-rolled SVG icon set (no external icon dep)
  ui/                      Dropzone, ProgressRing, DonutChart, BarChart,
                            Badges, Toggle, HandwritingSheet (AI-highlight
                            answer sheet mock), Logo
lib/
  api.ts                   New in Night 6 — typed client for every backend endpoint
  auth.tsx                 New in Night 6 — AuthProvider / useAuth()
  toast.tsx                New in Night 6 — ToastProvider / useToast()
  theme-provider.tsx       Theme context + no-flash init script (unchanged)
  app-store.tsx            Rewritten — real File blobs + exam selection, not mock data
  types.ts
```

## What's still local-only

`/settings` has three toggles (email notifications, auto-flag threshold,
weekly digest) that aren't backed by any backend field — the `settings`
table only stores `theme`. They're left in place as UI (clearly labeled
"local to this browser for now") rather than removed, since the spec didn't
ask for new backend columns and they don't block anything real.
