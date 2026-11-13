# Smart Career Placement & Internship Preparation Dashboard — Presentation Guide

## 1. One-line pitch

"A full-stack placement preparation platform that tells a student **where they stand, what they are missing, and exactly what to do next** — and gives the placement cell the analytics to see the whole batch."

Alternative, more casual:

"It is not just a job board. It is a preparation cockpit for students and an analytics dashboard for the placement cell."

---

## 2. The problem

Students usually prepare using scattered tools:

- Opportunities are shared in WhatsApp groups and PDFs.
- Eligibility rules (CGPA, backlogs, branch, batch, skills) are checked manually.
- Students do not know which skills they are missing for a target role.
- Preparation is unplanned — no roadmap, no progress tracking.
- Placement cells have no single view of student readiness or skill-gap trends.

**Result:** students apply blindly, waste time, and miss opportunities. The placement cell cannot intervene early.

---

## 3. The solution

One platform with two portals:

### Student portal
- Register / sign in securely
- Build an academic + skill profile
- Browse and filter opportunities
- Get **automatic eligibility** with human-readable reasons
- See a **skill-gap analysis** and readiness score for a target role or a specific opportunity
- Upload a PDF resume and auto-extract skills
- Track preparation topics and practice tasks
- Take **timed mock tests and aptitude drills** with scored, explained reviews
- Generate a **4-week study roadmap** from current gaps
- Track applications through a status pipeline
- See analytics: readiness, application funnel, weekly activity
- Get in-app deadline and event reminders

### Admin / placement-cell portal
- Student and opportunity management
- Application analytics
- Skill-gap trends across students and roles
- Learning-resource management
- Activate / deactivate student accounts

**Important differentiator:** the admin and student roles are separated on the **server**, not just hidden in the UI.

---

## 4. Technology stack

### Frontend
| Technology | What it does | Why it was chosen |
| --- | --- | --- |
| **React 18** | Component-based UI | Reusable pages, state-driven rendering |
| **Vite 6** | Dev server and production build | Fast HMR, small modern build |
| **React Router 6** | Client-side routing + protected routes | Nested layouts, role-based route guards |
| **Recharts** | Bar, line, pie/area charts | Simple responsive charts for analytics |
| **Lucide React** | Icon set | Lightweight, consistent icons |
| **Hand-written CSS** | Design system + responsive layout | No heavy UI framework; full control, 8k+ lines of custom CSS |

### Backend
| Technology | What it does | Why it was chosen |
| --- | --- | --- |
| **Node.js 20** | JavaScript runtime | Same language as frontend, good ecosystem |
| **Express 4** | REST API framework | Simple, explicit routing and middleware |
| **MySQL 8** | Relational database | Strong fit for structured, connected placement data |
| **mysql2/promise** | DB driver + connection pool | Parameterised queries, async/await |
| **Zod** | Request validation | Validates body/query, replaces raw input with parsed values |
| **bcryptjs** | Password hashing | Cost factor 12 |
| **jsonwebtoken** | JWT authentication | Stateless auth, 7-day tokens |
| **cookie-parser** | httpOnly cookie handling | Safer token storage than localStorage |
| **helmet** | Security headers | Mitigates common web vulnerabilities |
| **cors** | Cross-origin policy | Restricts API to known origins |
| **express-rate-limit** | Abuse protection | 30 auth attempts/15 min, 1,200 API calls/15 min |
| **multer** | File upload handling | In-memory PDF upload, size/MIME limits |
| **pdf-parse** | PDF text extraction | Resume text extraction in memory |
| **morgan** | Request logging | Dev/prod access logs |
| **dotenv** | Config management | Secrets stay in `.env` |
| **Supertest + Node test runner** | API integration tests | 33 tests covering core journeys |
| **nodemon** | Dev auto-restart | Faster development |

### Optional AI layer
- **OpenAI-compatible chat-completions API** (configurable model, default `gpt-4o-mini`)
- Used **only** for roadmap generation when `AI_API_KEY` is set and the request asks for it.
- If AI fails, the app falls back to the deterministic rule engine and returns a warning.

### Dev / tooling
- **Postman collection** for the whole API
- **docs/API.md** endpoint reference
- **Vite proxy** `/api → localhost:5000` in development
- **Express serves the built React SPA** in production (single-server deployment)
- **Git** for version control

---

## 5. Architecture

```
Browser
  │
  │  React 18 SPA (Vite, React Router, Recharts)
  │  fetch(..., { credentials: 'include' })
  ▼
Node.js + Express REST API  (port 5000)
  │  Helmet, CORS, rate limit, morgan
  │  Zod validation → JWT auth → role guard
  │  Controllers → Services → SQL
  ▼
MySQL 8  (31 tables, normalised schema)
```

### Where each concern lives
- `routes/` — endpoint definitions
- `controllers/` — HTTP request/response handling
- `services/` — business logic (eligibility, gaps, roadmap, analytics)
- `validators/` — Zod schemas
- `middleware/` — auth, roles, upload, validation, errors
- `db/` — schema, seed, setup, connection pool
- `tests/` — API journey + eligibility unit tests

The eligibility engine is deliberately **pure and database-independent**, so it can be reused and unit-tested.

---

## 6. The "smart" parts — explain these clearly

### A. Automatic eligibility engine
Instead of storing an `is_eligible` flag that goes stale, eligibility is recalculated on every request from the student's current profile.

Checks:
1. Branch
2. Graduation batch
3. Minimum CGPA
4. Maximum active backlogs
5. Class 10 / Class 12 percentages
6. Required skills at a minimum proficiency
7. Preferred skills (reported but do not block)

Result is one of:
- `eligible`
- `not_eligible`
- `needs_info` — profile data is missing

Every result includes a **check-by-check breakdown** and plain-English reasons. That is the key UX difference: the app does not just say "no", it explains why.

### B. Skill-gap analysis
- Compares the student's **self-reported** proficiency (1–5) against role requirements or a specific opportunity.
- Marks each skill `strong`, `weak`, or `missing`.
- Calculates **readiness** = percentage of required skills met.
- Prioritises gaps as `high` / `medium` / `low`.
- Maps each gap to a preparation topic and learning resource.
- Clearly labels the result as guidance, not a verified test score.

### C. Roadmap generation
- Default: **deterministic rule engine** — based on target role, top gaps, preparation topics, and curated resources.
- Optional: AI-generated 4-week plan through an OpenAI-compatible endpoint.
- AI output is validated and normalised (task count, date offsets, safe URLs) before saving.
- Plan is saved as `study_plans` + editable `study_tasks` with dates, priority, completion and overdue tracking.

### D. Resume parsing
- Only PDF accepted; max size configurable (default 5 MB).
- `multer` holds the file **in memory**; `pdf-parse` extracts text.
- Regex/alias matching detects skills from a curated catalogue.
- The **PDF itself is never stored** — only extracted text/metadata.
- Student reviews suggestions and imports only what they confirm.

### E. Mock tests and aptitude practice
- Seeded question bank of 36 questions across **quantitative aptitude, logical reasoning and verbal ability**.
- Three timed mock tests plus short topic-wise practice rounds with fresh random questions.
- The browser runs the countdown and question palette; the **server scores every submission** from stored correct options.
- Attempt history stores per-question selections, so students get an answer-by-answer review with written explanations.
- No negative marking, and unanswered questions are saved and clearly marked in the review.

### F. Analytics
- Eligibility mix, application funnel, preparation completion, skill distribution, 8-week activity trend, skill-gap trends for admins.
- Built with grouped SQL queries + `Promise.all` for parallel data loading.
- Charts are based only on data actually created in the app (honest analytics, no fake history).

---

## 7. Database design

**31 tables**, normalised:

- **Identity:** `roles`, `users`, `student_profiles`
- **Skills:** `skills`, `student_skills`, `role_skills`
- **Opportunities:** `opportunities`, `opportunity_branches`, `opportunity_batches`, `opportunity_skills`, `opportunity_requirements`
- **Applications:** `applications`, `bookmarks`
- **Resume:** `resumes`
- **Preparation:** `preparation_topics`, `learning_resources`, `practice_tasks`, `student_progress`, `practice_task_progress`, `personal_notes`
- **Practice and mock tests:** `practice_questions`, `mock_tests`, `mock_test_questions`, `practice_attempts`, `practice_attempt_answers`
- **Roadmap:** `study_plans`, `study_tasks`
- **Other:** `student_preferred_roles`, `student_projects`, `student_certifications`, `notifications`

Talking point: the schema separates **opportunity criteria** (branches, batches, skills, requirements) into join tables, so one opportunity can have many rules without duplicating columns.

---

## 8. Security and privacy

- Passwords hashed with **bcrypt** (cost 12).
- **JWT** in an `httpOnly`, `SameSite=Lax` cookie (`Secure` configurable) — not readable by JavaScript.
- Bearer token also supported for Postman/API clients.
- **Role checks on every protected route** — students cannot call admin endpoints and vice versa.
- **Zod validation** on bodies and query strings.
- **Parameterised SQL** everywhere; the only identifier that cannot be parameterised (DB name) is allow-list validated.
- **Helmet** security headers, restricted **CORS**, **rate limiting**.
- Upload restricted by MIME type, extension, count and size.
- No stack traces in production.
- Resume PDF not stored; resume text can be deleted by the student.

Known limitation to mention honestly: no CSRF token (mitigated by SameSite + JSON), no email/SMS provider, no OCR for scanned resumes.

---

## 9. Suggested live demo (6–8 minutes)

1. **Login as student** — `demo.student@example.com` / `Student@123`
2. **Dashboard** — show eligibility counts, pipeline, preparation progress, next steps.
3. **Opportunities** — filter, open one, show the eligibility explanation card.
4. **Skill Gap** — pick target role, show readiness and prioritised gaps.
5. **Resume** — upload a text-based PDF, show extracted skills and selective import.
6. **Preparation → Roadmap** — show topic progress, generate 4-week plan, mark a task complete.
7. **Mock tests & aptitude** — start a short aptitude drill, submit it, open the explained attempt review.
8. **Applications** — move a status from applied → interview.
9. **Analytics** — funnel, readiness, 8-week activity.
10. **Logout → login as admin** — `placement.cell@example.com` / `Admin@123`
11. **Admin** — student list, opportunity CRUD, application analytics, skill-gap trends.

If time is short: Dashboard → Opportunity eligibility → Skill Gap → Mock test review → Roadmap → Admin analytics.

---

## 10. How to run it (for the demo machine)

```bash
# 1. Backend
cd backend
cp .env.example .env        # set DB credentials + JWT_SECRET
npm install
npm run db:setup            # create tables + seed demo data
npm run dev                 # http://localhost:5000

# 2. Frontend (new terminal)
cd frontend
npm install
npm run dev                 # http://localhost:5173
```

Production-style single server:

```bash
cd frontend && npm run build
cd ../backend && npm start   # serves API + built SPA on :5000
```

---

## 11. Likely questions and strong answers

**"Is the eligibility result stored?"**
No. It is recalculated on every request from the latest profile so it can never be stale.

**"What if the student's profile is incomplete?"**
The result becomes `needs_info`, not a false "not eligible", and the UI tells them exactly which field is missing.

**"Is the AI required?"**
No. The default roadmap is a deterministic rule engine. AI is optional and falls back safely.

**"How do you know the skills are real?"**
You don't — they are self-reported for preparation planning. The app labels them as guidance, not verified scores.

**"How is role separation enforced?"**
JWT authentication → user loaded from DB → `requireRole('student' | 'admin')` middleware on the server for every protected route.

**"Is it production ready?"**
It is a complete educational/portfolio application. For real deployment you would add HTTPS, backups, a process manager, CSRF tokens, monitoring and a privacy/consent flow.

**"What was the hardest part?"**
The eligibility engine and the skill-gap-to-roadmap pipeline — turning many independent rules into one explainable result, then turning gaps into actionable, dated tasks.

---

## 12. Slide outline (if you need slides)

1. Title + one-line pitch
2. Problem
3. Solution overview (two portals)
4. Student features
5. Admin features
6. Architecture diagram
7. Tech stack
8. Key logic: eligibility engine
9. Key logic: skill gap → roadmap
10. Database design
11. Security
12. Demo / screenshots
13. Limitations and future work
14. Q&A

---

## 13. Honest limitations (mentioning these builds credibility)

- Sample opportunities are fictional and clearly marked `is_sample = 1`.
- Skill levels are self-reported, not tested.
- No email/SMS notifications — in-app only.
- No OCR for scanned/image PDFs.
- Analytics only show records created in this database.
- Single-server deployment; not horizontally scaled.

## 14. Future work (if asked)

- Email/push reminders
- OCR + better resume parsing
- Company/recruiter accounts
- Interview scheduling
- Exportable reports for the placement cell
- Docker + CI/CD + cloud deployment
