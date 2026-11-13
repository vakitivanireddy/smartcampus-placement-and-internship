# Smart Career Placement & Internship Preparation Dashboard

A full-stack placement-preparation platform for students and placement cells. Students can find opportunities, check eligibility automatically, analyse skill gaps, track preparation, build a study roadmap, upload a resume, and manage applications. Placement-cell administrators get a separate portal for students, opportunities, application analytics, skill-gap trends, and learning resources.

> **Sample data notice:** every seeded opportunity is fictitious demonstration data and is marked `is_sample = 1`. Company names are invented. Nothing in this repository is a verified live job listing, and eligibility results are not a guarantee of selection.

---

## Contents

- [Feature overview](#feature-overview)
- [Architecture](#architecture)
- [Project structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Local setup](#local-setup)
- [Demo accounts](#demo-accounts)
- [Running the app](#running-the-app)
- [Environment variables](#environment-variables)
- [Testing](#testing)
- [API documentation and Postman](#api-documentation-and-postman)
- [How the important logic works](#how-the-important-logic-works)
- [Security and privacy notes](#security-and-privacy-notes)
- [Troubleshooting](#troubleshooting)

---

## Feature overview

### Student portal

| Area | What works |
| --- | --- |
| Authentication | Register, sign in, sign out, persistent httpOnly-cookie session, account-deactivation handling |
| Profile | Academic details, CGPA/backlogs/percentages, target role, contact links, preferred roles, profile-completion checklist |
| Skills, projects, certifications | Full add/edit/delete CRUD with self-rated proficiency (1–5) |
| Opportunities | Search, filters (type, work mode, location, eligibility), sorting, pagination, bookmarks, detail view |
| Automatic eligibility | Recalculated from the current profile, branches, graduation batch, CGPA, backlogs, percentages, and required/preferred skills on every request |
| Resume | PDF-only upload, in-memory text extraction, skill suggestions, selective import, saved extraction metadata, delete record |
| Skill gap | Compare profile against a target role or a specific opportunity; readiness score, strengths, prioritised gaps, suggested preparation topics |
| Preparation centre | Topic library, per-topic practice tasks, completion progress, personal notes, curated learning resources |
| Mock tests & aptitude | Timed mock tests and topic-wise aptitude drills across quantitative, logical and verbal reasoning, with server-side scoring, question palette, attempt history and answer-by-answer explanations |
| Roadmap | Four-week rule-based plan generated from current gaps; add/edit/delete tasks and track completion/overdue work |
| Applications | Status pipeline (interested → applied → assessment → interview → selected/rejected), dates, notes, deadline/event list |
| Reminders | In-app notifications only, generated from bookmarked/tracked deadlines and upcoming assessments/interviews |
| Analytics | Preparation completion, category breakdown, application funnel, eligibility mix, skill distribution, eight-week activity trend |
| Dashboard | Eligibility counts, application pipeline, preparation progress, profile completion, next-step recommendations, upcoming deadlines/events |

### Admin portal

| Area | What works |
| --- | --- |
| Overview | Student/opportunity/application counts, average preparation completion, upcoming deadlines, recent applications, top skills |
| Students | Search, status filter, pagination, detail view, activate/deactivate account |
| Opportunities | List/search/filter, create, edit, delete, branch/batch/skill/extra-requirement management, active/sample flags |
| Applications | Status totals, per-opportunity breakdown, weekly application trend |
| Skill-gap trends | Aggregate missing-skill percentages by target role, with role filter |
| Resources | Learning-resource CRUD with optional topic mapping, type, provider, free/paid flag |

Role separation is enforced server-side: students cannot call admin endpoints, and admins cannot use student endpoints.

---

## Architecture

```
React 18 + Vite (SPA)
        │  fetch(credentials: 'include'), dev proxy /api → :5000
        ▼
Node.js 20 + Express REST API
        │  Zod validation, JWT httpOnly cookie (or Bearer), role guards
        ▼
MySQL 8 (normalised schema, parameterised mysql2 queries)
```

- **Frontend:** React 18, React Router 6, Recharts, Lucide icons, hand-written responsive CSS.
- **Backend:** Express 4, mysql2/promise, Zod, bcryptjs, jsonwebtoken, helmet, CORS, rate limiting, multer memory storage, pdf-parse.
- **Auth:** JWT signed with `JWT_SECRET`, delivered as the `sp_token` httpOnly cookie (`SameSite=Lax`, `Secure` configurable). The API also accepts `Authorization: Bearer <token>` for API clients such as Postman.
- **Serving:** in development Vite proxies `/api`. In production the Express server serves `frontend/dist` and falls back to `index.html` for SPA routes.

---

## Project structure

```
.
├── backend/
│   ├── src/
│   │   ├── config/          environment configuration
│   │   ├── controllers/     HTTP handlers
│   │   ├── db/              schema.sql, setup.js, seed.js, pool.js
│   │   ├── middleware/      auth/roles, validation, upload, errors
│   │   ├── routes/          REST route definitions
│   │   ├── services/        eligibility, gaps, roadmap, analytics, admin logic
│   │   ├── utils/           tokens, errors, async wrapper
│   │   ├── validators/      Zod request schemas
│   │   ├── app.js           Express app
│   │   └── server.js        HTTP server bootstrap
│   ├── tests/               Node test-runner API journey suite
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/             fetch client
│   │   ├── components/      layout, guards, shared UI
│   │   ├── context/         auth context
│   │   ├── hooks/           data-fetching hook
│   │   ├── pages/           student and admin pages
│   │   ├── styles/          design system and responsive CSS
│   │   └── utils/           formatting helpers
│   ├── public/
│   ├── vite.config.js
│   └── package.json
├── docs/API.md              full endpoint reference
├── postman/                 Postman collection + local environment
└── README.md
```

---

## Prerequisites

- **Node.js 20+** and npm 10+
- **MySQL 8.0+** running locally (or reachable over the network)
- A MySQL user that can create the application database and tables
- No paid AI key is required. The default roadmap is rule-based.

---

## Local setup

### 1. Create the database and MySQL user

Connect as a MySQL administrator and run the following, replacing the password:

```sql
CREATE DATABASE IF NOT EXISTS smart_placement
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'placement_app'@'localhost'
  IDENTIFIED BY 'replace_with_a_strong_password';

GRANT ALL PRIVILEGES ON smart_placement.* TO 'placement_app'@'localhost';
-- Needed only if you want db:setup to create the database itself:
-- GRANT CREATE ON *.* TO 'placement_app'@'localhost';
FLUSH PRIVILEGES;
```

The setup script runs `CREATE DATABASE IF NOT EXISTS` and then applies the schema, so the user needs `CREATE` permission if the database does not already exist. Alternatively, create the database as an administrator first (as shown above) and grant only the database-level privileges.

### 2. Configure and install the backend

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:

```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=placement_app
DB_PASSWORD=replace_with_a_strong_password
DB_NAME=smart_placement
DB_POOL_SIZE=10

JWT_SECRET=use_a_long_random_string_of_at_least_32_characters
JWT_EXPIRES_IN=7d
COOKIE_SECURE=false
```

Generate a suitable secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Then install and initialise:

```bash
npm install
npm run db:setup    # creates tables and seeds sample data
```

`db:setup` is idempotent for seed rows: it creates the schema if missing and inserts seed data only when not already present.

### 3. Install the frontend

```bash
cd ../frontend
npm install
```

The Vite dev server proxies `/api` to `http://localhost:5000`. Override the target with `VITE_PROXY_TARGET` if the API runs elsewhere:

```bash
VITE_PROXY_TARGET=http://localhost:5000 npm run dev
```

---

## Demo accounts

Created by `npm run db:setup`:

| Role | Email | Password |
| --- | --- | --- |
| Student | `demo.student@example.com` | `Student@123` |
| Admin (placement cell) | `placement.cell@example.com` | `Admin@123` |

The demo student has a seeded profile, skills, projects, certifications, resume metadata, preparation progress, bookmarks, applications, and a roadmap. These credentials are for local demonstration only; change or remove them before deploying.

---

## Running the app

### Development (two terminals)

```bash
# terminal 1
cd backend
npm run dev          # nodemon, http://localhost:5000

# terminal 2
cd frontend
npm run dev          # Vite, http://localhost:5173
```

Open `http://localhost:5173`.

### Production-style single server

```bash
cd frontend
npm run build        # writes frontend/dist

cd ../backend
npm start            # serves API + built SPA on http://localhost:5000
```

Express detects `frontend/dist` at startup. Rebuild the frontend after client changes. Set `COOKIE_SECURE=true` when serving over HTTPS, and put `CLIENT_URL` at the real frontend origin. For a separate frontend deployment, configure `CLIENT_URL` with the allowed origin(s), comma-separated.

### Useful backend scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start API with nodemon |
| `npm start` | Start API with Node |
| `npm run db:setup` | Apply schema and seed |
| `npm run db:seed` | Seed only |
| `npm test` | Run API test suite |
| `npm run test:coverage` | Run tests with Node coverage |

---

## Environment variables

All backend variables live in `backend/.env`; see `backend/.env.example`.

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `PORT` | no | `5000` | API port |
| `NODE_ENV` | no | `development` | `development`, `test`, or `production` |
| `CLIENT_URL` | no | `http://localhost:5173` | Allowed CORS origin(s), comma-separated |
| `DB_HOST` | no | `127.0.0.1` | MySQL host |
| `DB_PORT` | no | `3306` | MySQL port |
| `DB_USER` | no | `root` | MySQL user |
| `DB_PASSWORD` | no | empty | MySQL password |
| `DB_NAME` | no | `smart_placement` | Database name |
| `DB_POOL_SIZE` | no | `10` | Connection pool size |
| `JWT_SECRET` | **yes** | — | JWT signing secret; 32+ chars required in production |
| `JWT_EXPIRES_IN` | no | `7d` | Token lifetime |
| `COOKIE_SECURE` | no | `false` | Set `true` behind HTTPS |
| `MAX_RESUME_MB` | no | `5` | Maximum PDF upload size |
| `AI_API_KEY` | no | empty | Optional OpenAI-compatible key for roadmap generation |
| `AI_API_URL` | no | OpenAI chat-completions URL | Optional compatible endpoint |
| `AI_MODEL` | no | `gpt-4o-mini` | Optional model name |
| `DEADLINE_REMINDER_DAYS` | no | `7` | Window for in-app deadline reminders |

The frontend needs no secrets. `VITE_PROXY_TARGET` optionally changes the dev proxy target. When the frontend is deployed separately from the API, set `VITE_API_URL` (for example `https://api.example.com/api`) before `npm run build`; leave it empty to use the same-origin `/api` path.

---

## Testing

The API suite uses Node's built-in test runner and Supertest. It covers auth, role isolation, profile CRUD, eligibility rules, resume extraction/import, preparation, mock tests and aptitude practice, roadmap, applications, notifications, analytics, and admin endpoints.

Create and seed a **separate** test database first:

```sql
CREATE DATABASE smart_placement_test
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Then run with the env override so the development database is never touched:

```bash
cd backend
DB_NAME=smart_placement_test NODE_ENV=test npm run db:setup
DB_NAME=smart_placement_test NODE_ENV=test npm test
```

Expected: `32` tests passing. The suite creates a temporary user and removes it afterwards. Re-run `db:setup` for the test database if you want to restore seeded demo rows.

Frontend production build check:

```bash
cd frontend
npm run build
```

---

## API documentation and Postman

- Full endpoint reference: [`docs/API.md`](docs/API.md)
- Postman collection: [`postman/smart-placement.postman_collection.json`](postman/smart-placement.postman_collection.json)
- Postman local environment: [`postman/smart-placement-local.postman_environment.json`](postman/smart-placement-local.postman_environment.json)
- Import instructions: [`postman/README.md`](postman/README.md)

The API base path is `/api`. Auth uses the `sp_token` httpOnly cookie; Postman's cookie jar retains it automatically after login. Bearer-token requests are also supported by sending `Authorization: Bearer <token>`.

---

## How the important logic works

### Automatic eligibility

Eligibility is **not** stored as a stale flag. It is recalculated on every opportunity list/detail request from the student's current profile and the opportunity criteria:

1. **Hard criteria** — active deadline, graduation batch, branch, minimum CGPA, maximum backlogs, minimum 10th/12th percentages.
2. **Required skills** — every required skill must be present at or above `min_proficiency`.
3. **Preferred skills** — reported in the explanation but never block eligibility.
4. **Status** — `not_eligible` if any hard criterion fails; `needs_info` if data required for a configured criterion is missing; otherwise `eligible`.
5. Every result includes human-readable reasons and checks so the UI can explain the outcome.

### Skill gaps

Gaps compare confirmed, **self-reported** proficiency (1–5) with role requirements (`role_skills`) or a specific opportunity's required skills. Missing preferred skills do not affect eligibility. Readiness is the percentage of *required* skills met. The API labels these results as preparation guidance, not tested scores or verified credentials.

### Resume handling

- Only PDF is accepted (`application/pdf` / `application/x-pdf`, `.pdf` extension).
- Files are held in memory by multer and parsed with `pdf-parse`; **the PDF itself is not stored**.
- Extracted text and structured metadata are saved in the `resumes` table so the student can review them; skill suggestions are imported only when the student confirms.
- Text-based PDFs work best. Scanned/image-only PDFs will fail gracefully, and the UI directs the student to add skills manually.

### Roadmap generation

- Default: deterministic rule engine based on the student's target role, gap priorities, preparation topics, and curated resources. No API key or external service is needed.
- Optional: if `AI_API_KEY` is configured and the request sets `use_ai: true`, an OpenAI-compatible endpoint is called. Failures fall back to the rule engine and return an `ai_warning`.
- Generated plans are normalised into `study_plans` and `study_tasks`, editable by the student.

### Reminders

- Notifications are written to the `notifications` table and shown in the in-app bell/dropdown and Notifications page.
- They are generated from bookmarked/tracked deadlines and upcoming assessment/interview dates.
- **No email or SMS provider is configured.** The application does not claim to send messages outside the app.

### Sample opportunities

- Seed data uses fictitious companies, marks every record with `is_sample = 1`, and includes explicit "SAMPLE LISTING" wording in descriptions.
- The API returns sample-data notices in list/bookmark/dashboard payloads.
- One expired opportunity is retained to exercise deadline handling.
- Admins can create real internal records, but they must consciously change the sample flag; the UI documents this.

---

## Security and privacy notes

- Passwords are hashed with bcrypt (cost 12).
- SQL uses parameterised `mysql2` queries; identifiers that cannot be parameterised (database name) are allow-list validated.
- All request bodies and query strings pass Zod validation and are replaced with parsed values.
- Auth cookies are httpOnly; `Secure` is enabled with `COOKIE_SECURE=true`; CSRF exposure is limited by `SameSite=Lax` and JSON requests, but add CSRF tokens if you introduce cross-site form posts.
- Role checks run on the server for every protected route.
- Auth endpoints are rate-limited (30 attempts / 15 min); the API has a broader 1,200 requests / 15 min limit.
- Helmet sets security headers; CORS is restricted to configured origins (plus localhost in development).
- Uploads are restricted by MIME type, extension, count, and size; only extracted resume text is persisted.
- Error responses never expose stack traces in production.
- Secrets belong in `backend/.env`, which is gitignored. Rotate the JWT secret to invalidate all issued sessions.
- Resume text can contain personal data. Treat the database as sensitive and provide a deletion path (the UI supports deleting resume records).

For a real deployment, also add HTTPS, database backups, log retention controls, a production process manager, and an explicit privacy/consent notice for resume processing.

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `JWT_SECRET is not configured` | Copy `backend/.env.example` to `backend/.env` and set a secret |
| `ER_ACCESS_DENIED_ERROR` | Check `DB_USER`/`DB_PASSWORD`; the user needs access to the target database |
| `Unknown database` during setup | Grant `CREATE` or create the database manually |
| Frontend requests return 404/502 | Ensure the API is running on port 5000 and Vite's proxy target matches |
| Login succeeds but later requests are 401 | Cookies must be enabled; verify `CLIENT_URL`/origin, and use HTTPS with `COOKIE_SECURE=true` when deployed |
| Resume upload says extraction failed | Use a text-based PDF; scanned PDFs need OCR, which this project does not implement |
| Tests fail with missing tables | Run `DB_NAME=smart_placement_test NODE_ENV=test npm run db:setup` first |
| Charts have no history | Analytics only charts records created in this database; new accounts start empty by design |
| `frontend/dist` looks stale | Re-run `npm run build`; Express serves the built files, not the Vite dev server |

---

## License

This project was built as an educational/portfolio application. Sample company names, listings, and seeded student data are fictional.
