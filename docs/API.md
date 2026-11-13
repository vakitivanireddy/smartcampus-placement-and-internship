# API Reference

REST API for the Smart Career Placement & Internship Preparation Dashboard.

- **Base URL (development):** `http://localhost:5000/api`
- **Frontend dev origin:** `http://localhost:5173` (Vite proxies `/api`)
- **Content type:** `application/json` for all requests except resume upload (`multipart/form-data`)
- **Authentication:** JWT in the `sp_token` httpOnly cookie, or `Authorization: Bearer <token>`
- **API version:** unversioned (`/api`)

> All opportunity data created by the seed script is **sample demonstration data**. Company names are fictitious and records are marked `is_sample: true`. No response represents a verified live job.

---

## Contents

- [Conventions](#conventions)
- [Authentication and health](#authentication-and-health)
- [Profile, skills, projects and certifications](#profile-skills-projects-and-certifications)
- [Opportunities and eligibility](#opportunities-and-eligibility)
- [Resume](#resume)
- [Skill gap](#skill-gap)
- [Preparation centre](#preparation-centre)
- [Practice, aptitude and mock tests](#practice-aptitude-and-mock-tests)
- [Roadmap](#roadmap)
- [Applications](#applications)
- [Notifications](#notifications)
- [Dashboard and analytics](#dashboard-and-analytics)
- [Admin](#admin)
- [Enumerations](#enumerations)
- [Rate limits and upload constraints](#rate-limits-and-upload-constraints)

---

## Conventions

### Authentication

Log in with `POST /api/auth/login`. The response sets:

```http
Set-Cookie: sp_token=<jwt>; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800
```

Send cookies on subsequent requests. Browser `fetch` calls must use `credentials: 'include'`. Non-browser clients may instead send:

```http
Authorization: Bearer <jwt>
```

Logout clears the cookie. The JWT is valid for `JWT_EXPIRES_IN` (default 7 days) and includes the user ID, role, and email. Deactivated accounts are rejected with `403` even if their token is still valid.

### Roles

| Role | Access |
| --- | --- |
| `student` | `/api/profile/*`, `/api/opportunities/*`, `/api/resume/*`, `/api/skill-gap/*`, `/api/preparation/*`, `/api/practice/*`, `/api/roadmap/*`, `/api/applications/*`, `/api/notifications/*`, `/api/dashboard`, `/api/analytics` |
| `admin` | `/api/admin/*`, `/api/notifications/*` |
| anonymous | `/api/health`, `/api/auth/register`, `/api/auth/login`, `/api/auth/logout` |

Calling an endpoint for the other role returns `403`.

### Success envelope

Most endpoints return one of:

```json
{ "data": { }, "message": "Optional human-readable message." }
```

Lists return:

```json
{
  "data": [],
  "pagination": { "total": 15, "page": 1, "limit": 8, "pages": 2, "has_next": true, "has_prev": false },
  "meta": { }
}
```

Some endpoints add top-level `summary` (preparation topics) or `meta` (notices, caveats, generation details). Admin student/opportunity lists return pagination without `has_next`/`has_prev`.

### Error envelope

```json
{
  "error": {
    "message": "Please correct the highlighted fields.",
    "details": [
      { "field": "email", "message": "Enter a valid email address." }
    ]
  }
}
```

| Status | Meaning |
| --- | --- |
| `400` | Validation failure, invalid date, bad upload, or business-rule input error |
| `401` | Missing, invalid, or expired session |
| `403` | Wrong role, deactivated account, or disallowed CORS origin |
| `404` | Resource not found, including records not owned by the caller |
| `409` | Duplicate email, duplicate application, or referenced record conflict |
| `429` | Rate limit exceeded |
| `500` | Unexpected server error (generic message in production) |

Stack traces are logged server-side and never returned.

### Dates

- Date-only fields use `YYYY-MM-DD`.
- Date-time fields accept ISO-8601 strings (for example `2026-11-05T10:30:00.000Z`) or MySQL-style `YYYY-MM-DD HH:MM:SS`; they are stored in UTC.
- The API returns opportunity deadlines as `YYYY-MM-DD`.

### Pagination

Student opportunities: `page` (default 1), `limit` (default 8, max 50).
Admin students: `page` (default 1), `limit` (default 10, max 50).
Admin opportunities: `page` (default 1), `limit` (default 10, max 50).

---

## Authentication and health

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/health` | public | Liveness and database check |
| `POST` | `/api/auth/register` | public | Create a student account and session |
| `POST` | `/api/auth/login` | public | Sign in (student or admin) |
| `POST` | `/api/auth/logout` | public | Clear the auth cookie |
| `GET` | `/api/auth/me` | any session | Current user and profile |

### `GET /api/health`

```json
{
  "status": "ok",
  "database": "connected",
  "time": "2026-10-27T09:15:00.000Z"
}
```

### `POST /api/auth/register`

Registration always creates a **student**. Admin accounts are provisioned by the seed script.

```json
{
  "name": "Aarav Sharma",
  "email": "aarav@example.com",
  "password": "Student@123",
  "college": "Sunrise Institute of Technology",
  "branch": "CSE",
  "graduationYear": 2027,
  "cgpa": 7.8,
  "targetRole": "Java Developer"
}
```

| Field | Rules |
| --- | --- |
| `name` | 2–120 characters |
| `email` | Valid email, max 190, normalised to lowercase |
| `password` | 8–128 chars, at least one uppercase, lowercase, and digit |
| `college` / `branch` / `targetRole` | Optional strings |
| `graduationYear` | Optional, 2000–2100 |
| `cgpa` | Optional, 0–10 |

**201 Created**

```json
{
  "data": {
    "user": {
      "id": 42,
      "name": "Aarav Sharma",
      "email": "aarav@example.com",
      "role": "student",
      "is_active": true,
      "profile": { "college": "Sunrise Institute of Technology", "branch": "CSE", "graduation_year": 2027 },
      "preferred_roles": [],
      "skills": []
    }
  },
  "message": "Account created. Welcome!"
}
```

The response also sets the auth cookie. Duplicate email: `409`.

### `POST /api/auth/login`

```json
{ "email": "demo.student@example.com", "password": "Student@123" }
```

Returns the same `data.user` shape as registration. Invalid credentials: `401`. Deactivated account: `403`.

### `POST /api/auth/logout`

```json
{ "message": "Signed out." }
```

### `GET /api/auth/me`

Returns `{ "data": { "user": { ... } } }`. Student users include `profile`, `preferred_roles`, and confirmed `skills`:

```json
{
  "data": {
    "user": {
      "id": 2,
      "name": "Aarav Sharma",
      "email": "demo.student@example.com",
      "role": "student",
      "is_active": true,
      "profile": {
        "college": "Sunrise Institute of Technology",
        "branch": "CSE",
        "graduation_year": 2027,
        "cgpa": "7.80",
        "active_backlogs": 0,
        "tenth_percentage": "88.00",
        "twelfth_percentage": "84.00",
        "target_role": "Java Developer",
        "phone": null,
        "bio": null,
        "linkedin_url": null,
        "github_url": null
      },
      "preferred_roles": ["Java Developer"],
      "skills": [
        {
          "id": 12,
          "skill_id": 1,
          "name": "Java",
          "category": "programming",
          "proficiency": 4,
          "source": "manual",
          "is_confirmed": true
        }
      ]
    }
  }
}
```

`Decimal` database columns may be serialised as strings by the MySQL driver.

---

## Profile, skills, projects and certifications

All routes require a **student** session.

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/profile` | Profile, skills, projects, certifications, latest resume, completion checklist |
| `PUT` | `/api/profile` | Update profile fields and preferred roles |
| `GET` | `/api/profile/skills/catalogue?search=` | Skill catalogue (max 100, optional search) |
| `POST` | `/api/profile/skills` | Add or upsert a student skill |
| `PUT` | `/api/profile/skills/:id` | Update proficiency/confirmation |
| `DELETE` | `/api/profile/skills/:id` | Remove a student skill |
| `GET` | `/api/profile/projects` | List projects |
| `POST` | `/api/profile/projects` | Add a project |
| `PUT` | `/api/profile/projects/:id` | Update a project |
| `DELETE` | `/api/profile/projects/:id` | Delete a project |
| `GET` | `/api/profile/certifications` | List certifications |
| `POST` | `/api/profile/certifications` | Add a certification |
| `PUT` | `/api/profile/certifications/:id` | Update a certification |
| `DELETE` | `/api/profile/certifications/:id` | Delete a certification |

### `GET /api/profile`

```json
{
  "data": {
    "user": { "id": 2, "name": "Aarav Sharma", "profile": { }, "skills": [], "preferred_roles": [] },
    "projects": [{ "id": 1, "title": "Campus Ride Share API", "description": "...", "tech_stack": "Node.js, MySQL", "link": "https://..." }],
    "certifications": [{ "id": 1, "name": "Java Programming Fundamentals", "issuer": "Coursera", "issue_date": "2026-05-01", "credential_url": null }],
    "latest_resume": { "id": 3, "original_filename": "resume.pdf", "status": "processed", "created_at": "..." },
    "completion": {
      "percent": 83,
      "checks": [
        { "label": "Basic and academic details", "done": true },
        { "label": "Resume uploaded", "done": true }
      ]
    }
  }
}
```

### `PUT /api/profile`

All fields are parsed by Zod; omitted/empty optional fields are stored as `NULL` (except `name`, which is required). Send the full profile form.

```json
{
  "name": "Aarav Sharma",
  "college": "Sunrise Institute of Technology",
  "branch": "CSE",
  "graduation_year": 2027,
  "cgpa": 7.8,
  "active_backlogs": 0,
  "tenth_percentage": 88,
  "twelfth_percentage": 84,
  "target_role": "Java Developer",
  "phone": "+91 90000 00000",
  "bio": "Backend-focused final-year student.",
  "linkedin_url": "https://www.linkedin.com/in/example",
  "github_url": "https://github.com/example",
  "preferred_roles": ["Java Developer", "Backend Developer"]
}
```

- `preferred_roles`: max 5 strings. Replaces the previous list.
- URLs must include a protocol (`https://`).
- Returns `{ "data": { "user": { ... } }, "message": "Profile updated successfully." }`.

### Skills

`POST /api/profile/skills` accepts a catalogue ID or a free-text name:

```json
{ "skill_id": 1, "proficiency": 4, "source": "manual", "is_confirmed": true }
```

or

```json
{ "name": "Apache Kafka", "proficiency": 3 }
```

- `proficiency` is 1–5 (default 3).
- `source` is `manual` or `resume` (default `manual`).
- Adding an existing skill upserts proficiency/source and confirms it.
- New names are added to the `skills` catalogue with category `concept`.
- Response `201`: `{ "data": { "id": 12, "skill_id": 55, "name": "Apache Kafka", "proficiency": 3, ... }, "message": "Skill added." }`

`PUT /api/profile/skills/:id` accepts any of `{ "proficiency": 1-5, "is_confirmed": true }`. Returns `{ "message": "Skill updated." }`.

`DELETE` returns `{ "message": "Skill removed." }`. Deleting a non-existent/unowned record still returns success (idempotent delete).

### Projects

```json
{
  "title": "Placement Tracker Dashboard",
  "description": "React dashboard for application tracking.",
  "tech_stack": "React, CSS, REST APIs",
  "link": "https://github.com/example/tracker"
}
```

`title` is required (2–180). `description` max 2,000; `tech_stack` max 500; `link` must be a URL. `POST` returns `201` with the created row; `PUT` replaces all fields.

### Certifications

```json
{
  "name": "SQL for Data Science",
  "issuer": "Coursera",
  "issue_date": "2026-06-15",
  "credential_url": "https://coursera.org/verify/example"
}
```

`name` required (2–180). `issue_date` is `YYYY-MM-DD` or empty/null. `POST` returns `201` with the created row; `PUT` replaces all fields.

---

## Opportunities and eligibility

All routes require a **student** session.

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/opportunities/meta/filters` | Available types, work modes, locations, branches |
| `GET` | `/api/opportunities` | Search/filter/sort/paginate opportunities |
| `GET` | `/api/opportunities/bookmarks` | Bookmarked opportunities |
| `GET` | `/api/opportunities/:id` | Opportunity detail + fresh eligibility |
| `GET` | `/api/opportunities/:id/eligibility` | Eligibility only, recalculated now |
| `POST` | `/api/opportunities/:id/bookmark` | Toggle bookmark |

### Query parameters for `GET /api/opportunities`

| Parameter | Type | Default | Notes |
| --- | --- | --- | --- |
| `page` | integer ≥1 | `1` | |
| `limit` | integer 1–50 | `8` | |
| `search` | string ≤120 | — | Matches title, company, location, description, and skill names |
| `type` | `internship`, `placement`, `job` | — | |
| `work_mode` | `onsite`, `remote`, `hybrid` | — | |
| `location` | string ≤100 | — | Case-insensitive contains match |
| `eligibility` | `eligible`, `not_eligible`, `needs_info` | — | Applied after recalculation |
| `sort` | `deadline_asc`, `deadline_desc`, `newest`, `company_asc`, `cgpa_desc`, `eligibility` | `deadline_asc` | |
| `include_expired` | `true`/`false` | `false` | Expired records are otherwise excluded |
| `bookmarked` | `true`/`false` | `false` | Only bookmarked records |

Active opportunities only. Eligibility is evaluated against the current profile on every request.

**200 OK (abridged)**

```json
{
  "data": [
    {
      "id": 3,
      "title": "Software Engineering Intern",
      "company": "PixelWorks Labs",
      "type": "internship",
      "location": "Bengaluru",
      "work_mode": "hybrid",
      "salary_stipend": "₹25,000 / month",
      "description": "SAMPLE LISTING — ...",
      "min_cgpa": "7.00",
      "openings": 4,
      "application_deadline": "2026-11-20",
      "other_requirements": null,
      "is_active": true,
      "is_sample": true,
      "is_expired": false,
      "branches": ["CSE", "IT"],
      "batches": [2027],
      "skills": [
        { "skill_id": 6, "name": "JavaScript", "category": "programming", "importance": "required", "min_proficiency": 3, "resource_url": "https://..." }
      ],
      "requirements": [
        { "type": "max_backlogs", "value": 1, "label": "No more than one active backlog" }
      ],
      "is_bookmarked": false,
      "application_status": null,
      "eligibility": { "status": "eligible", "summary": "...", "checks": [], "reasons": [], "missingSkills": [], "matchedSkills": [], "preferredMissing": [] }
    }
  ],
  "pagination": { "total": 14, "page": 1, "limit": 8, "pages": 2, "has_next": true, "has_prev": false },
  "meta": {
    "data_notice": "All seeded opportunities are clearly labelled sample data for demonstration, not verified live openings.",
    "eligibility_recalculated": "2026-10-27T09:20:00.000Z"
  }
}
```

### Eligibility object

```json
{
  "status": "needs_info",
  "summary": "Some information needed for an eligibility decision is missing from your profile.",
  "checks": [
    { "key": "branch", "label": "Branch", "status": "pass", "detail": "CSE is an eligible branch." },
    { "key": "cgpa", "label": "Minimum CGPA", "status": "unknown", "detail": "Add your CGPA to check the minimum of 7." },
    { "key": "skills", "label": "Required skills", "status": "fail", "detail": "1 of 4 required skills are missing or below the expected level: SQL." }
  ],
  "reasons": [
    { "severity": "error", "message": "You are not eligible because ..." },
    { "severity": "info", "message": "Your CGPA is missing, so ..." }
  ],
  "missingSkills": [
    { "name": "SQL", "importance": "required", "min_proficiency": 3, "current_proficiency": null, "gap": 3 }
  ],
  "matchedSkills": [
    { "name": "Java", "proficiency": 4, "min_proficiency": 3 }
  ],
  "preferredMissing": [
    { "name": "Docker", "min_proficiency": 2, "current_proficiency": null }
  ]
}
```

Decision order:

1. Any failed check → `not_eligible`.
2. Otherwise, any unknown check → `needs_info`.
3. Otherwise → `eligible`.

Preferred skills never block eligibility; they appear in `preferredMissing` and an informational reason.

### `GET /api/opportunities/meta/filters`

```json
{
  "data": {
    "types": [{ "value": "internship", "label": "Internship" }],
    "work_modes": [{ "value": "remote", "label": "Remote" }],
    "locations": ["Bengaluru", "Remote"],
    "branches": ["CSE", "IT"]
  },
  "meta": { "notice": "Every seeded opportunity is sample data, not a verified live opening." }
}
```

### `GET /api/opportunities/:id`

Returns `{ "data": { ...opportunity, "eligibility": { ... } } }` or `404`.

### `GET /api/opportunities/:id/eligibility`

```json
{
  "data": { "status": "eligible", "summary": "...", "checks": [], "reasons": [], "missingSkills": [], "matchedSkills": [], "preferredMissing": [] },
  "meta": { "recalculated_at": "2026-10-27T09:21:00.000Z" }
}
```

### `POST /api/opportunities/:id/bookmark`

Toggles the bookmark.

- Added: `201` `{ "data": { "bookmarked": true }, "message": "Saved to bookmarks." }`
- Removed: `200` `{ "data": { "bookmarked": false }, "message": "Removed from bookmarks." }`

### `GET /api/opportunities/bookmarks`

Returns bookmarked active/inactive opportunities with children and fresh eligibility. `meta.notice` repeats the sample-data notice.

---

## Resume

All routes require a **student** session. The PDF is parsed in memory and is **not stored**.

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/api/resume/upload` | Upload and parse a PDF (multipart field `resume`) |
| `GET` | `/api/resume` | List the last 20 resume records (without full text) |
| `GET` | `/api/resume/:id` | One resume record, including extracted text |
| `POST` | `/api/resume/:id/import-skills` | Import selected skills |
| `DELETE` | `/api/resume/:id` | Delete a resume record |

### `POST /api/resume/upload`

`Content-Type: multipart/form-data`, field name `resume`.

- Accepted MIME types: `application/pdf`, `application/x-pdf`; extension must be `.pdf`.
- Maximum size: `MAX_RESUME_MB` (default 5 MB), one file.
- Rate-limited to 15 uploads per hour per IP.

**201 Created**

```json
{
  "data": {
    "resume": {
      "id": 4,
      "original_filename": "aarav-resume.pdf",
      "mime_type": "application/pdf",
      "file_size": 24800,
      "status": "processed",
      "error_message": null,
      "extracted_text": "Aarav Sharma ...",
      "extracted_data": {
        "emails": ["aarav@example.com"],
        "phones": [],
        "links": ["https://github.com/example"],
        "skills": ["Java", "SQL", "React"],
        "education": ["B.Tech Computer Science"],
        "warnings": []
      },
      "created_at": "2026-10-27T09:25:00.000Z"
    },
    "suggestions": [
      { "name": "Java", "category": "programming", "skill_id": 1, "proficiency": 3 },
      { "name": "React", "category": "framework", "skill_id": 12, "proficiency": 3 }
    ]
  },
  "message": "Resume processed. Review the extracted skills and information before importing."
}
```

If parsing fails, a `failed` resume row is recorded and the API returns `400` with a friendly message and `details: [{ field: "resume", message }]`. Scanned/image-only PDFs are not OCR'd.

### `POST /api/resume/:id/import-skills`

```json
{
  "skills": [
    { "skill_id": 1, "proficiency": 3 },
    { "name": "Apache Kafka", "proficiency": 2 }
  ]
}
```

- 1–50 skills; each needs `skill_id` or `name`.
- Unknown names are added to the catalogue as `concept`.
- Existing student skills are updated and confirmed with source `resume`.
- Response: `{ "message": "2 skills imported. ...", "meta": { "imported": 2 } }`.

`GET /api/resume` returns records with `extracted_text` omitted plus `meta.privacy` explaining the in-memory processing model.

---

## Skill gap

Requires a **student** session.

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/skill-gap/roles` | Role names from `role_skills` plus the student's target/preferred roles |
| `GET` | `/api/skill-gap?role=Java%20Developer` | Gap against a role |
| `GET` | `/api/skill-gap?opportunity_id=3` | Gap against a specific opportunity |

If `role` is omitted, the profile's target role is used; if that is empty, the service falls back to `Java Developer`. `404` if no requirements are configured for the requested/fallback role.

**200 OK (abridged)**

```json
{
  "data": {
    "target_label": "Java Developer",
    "role": "Java Developer",
    "mode": "role",
    "opportunity_id": null,
    "readiness": 56,
    "summary": {
      "total": 9,
      "required_total": 8,
      "required_met": 4,
      "preferred_total": 1,
      "preferred_met": 1,
      "missing": 2,
      "weak": 2,
      "strong": 5,
      "high_priority": 3
    },
    "items": [
      {
        "skill_id": 1,
        "name": "Data Structures and Algorithms",
        "category": "concept",
        "importance": "required",
        "required_proficiency": 4,
        "current_proficiency": 2,
        "status": "weak",
        "gap": 2,
        "progress": 50,
        "priority": "high",
        "resource_url": "https://...",
        "topic_slug": "dsa",
        "topic_title": "Data Structures and Algorithms",
        "why": "You have Data Structures and Algorithms at a self-rated level of 2/5 ...",
        "self_reported": true
      }
    ],
    "strengths": ["Java"],
    "gaps": [],
    "recommendations": [
      {
        "skill": "Data Structures and Algorithms",
        "priority": "high",
        "action": "Strengthen ... with focused practice.",
        "why": "...",
        "resource_url": "https://...",
        "topic_slug": "dsa"
      }
    ],
    "caveat": "Proficiency levels are self-reported for preparation planning. They are not test scores or verified credentials. Missing preferred skills never block eligibility."
  }
}
```

`GET /api/skill-gap/roles` returns `{ "data": [{ "name": "Java Developer", "is_current": true }], "meta": { "caveat": "..." } }`.

---

## Preparation centre

Requires a **student** session.

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/preparation/topics` | All active topics with progress, resources, notes counts, summary |
| `GET` | `/api/preparation/topics/:slug` | Topic detail, resources, tasks, notes, neighbours |
| `PUT` | `/api/preparation/topics/:id/progress` | Mark topic complete/incomplete |
| `PUT` | `/api/preparation/tasks/:id/progress` | Mark practice task complete/incomplete |
| `POST` | `/api/preparation/topics/:id/notes` | Create a note |
| `GET` | `/api/preparation/notes` | All personal notes |
| `PUT` | `/api/preparation/notes/:id` | Update a note |
| `DELETE` | `/api/preparation/notes/:id` | Delete a note |

### `GET /api/preparation/topics`

```json
{
  "data": [
    {
      "id": 1,
      "slug": "dsa",
      "title": "Data Structures and Algorithms",
      "category": "DSA",
      "description": "...",
      "estimated_minutes": 600,
      "sort_order": 1,
      "is_completed": false,
      "completed_at": null,
      "tasks_total": 8,
      "tasks_completed": 3,
      "resources_total": 4,
      "notes_total": 1,
      "progress_percent": 38
    }
  ],
  "summary": {
    "topics_total": 18,
    "topics_completed": 5,
    "completion_percent": 28,
    "practice_tasks_total": 120,
    "practice_tasks_completed": 34,
    "practice_percent": 28,
    "categories": [{ "category": "DSA", "total": 3, "completed": 1 }],
    "total_estimated_minutes": 7200
  }
}
```

### `GET /api/preparation/topics/:slug`

Returns `data` containing topic fields plus:

```json
{
  "id": 1,
  "slug": "dsa",
  "title": "Data Structures and Algorithms",
  "is_completed": false,
  "resources": [
    { "id": 1, "title": "NeetCode Roadmap", "url": "https://neetcode.io/roadmap", "provider": "NeetCode", "resource_type": "practice", "is_free": true }
  ],
  "tasks": [
    { "id": 1, "title": "Solve arrays and hashing problems", "description": "...", "sort_order": 1, "is_completed": true, "completed_at": "..." }
  ],
  "notes": [
    { "id": 1, "title": "Two-pointer pattern", "body": "...", "created_at": "...", "updated_at": "..." }
  ],
  "progress": { "tasks_total": 8, "tasks_completed": 3, "percent": 38 },
  "previous": { "slug": "programming-languages", "title": "Programming Languages" },
  "next": { "slug": "dbms-sql", "title": "DBMS and SQL" }
}
```

### Progress updates

```json
{ "completed": true }
```

- Topic response: `{ "message": "Topic marked as completed.", "data": { "completed": true } }`
- Task response includes recount: `{ "message": "Practice task completed.", "data": { "completed": true, "tasks_total": 8, "tasks_completed": 4 } }`

Progress is upserted per user/topic or user/task. Un-completing clears `completed_at`.

### Notes

```json
{ "title": "Two-pointer pattern", "body": "Use left/right pointers when the array is sorted..." }
```

`title` 2–180, `body` 1–5,000. Create returns `201` with the row. Update/delete only affect notes owned by the caller; updating a missing/unowned note returns `404`, deleting is idempotent.

---

## Practice, aptitude and mock tests

Requires a **student** session.

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/practice/overview` | Practice stats, aptitude category progress, mock test list, recent attempts |
| `GET` | `/api/practice/aptitude/questions` | Random aptitude questions; query `category` (`quantitative`, `logical`, `verbal`, `mixed`) and `limit` (5–25) |
| `POST` | `/api/practice/aptitude/attempts` | Score and save an aptitude practice round |
| `GET` | `/api/practice/mock-tests` | Active mock tests with question count and the caller's best score |
| `GET` | `/api/practice/mock-tests/:slug` | Mock test details and questions (answers are never exposed) |
| `POST` | `/api/practice/mock-tests/:slug/attempts` | Score and save a mock test attempt |
| `GET` | `/api/practice/attempts` | Attempt history, newest first; supports `page` and `limit` |
| `GET` | `/api/practice/attempts/:id` | Full review with the selected option, correct option and explanation |

Questions are stored in the seeded question bank. Each question has a category (`quantitative`, `logical` or `verbal`), difficulty, four options, one 0-based correct option and a written explanation. The seeded library contains 36 questions and three mock tests.

### `GET /api/practice/overview`

```json
{
  "data": {
    "stats": {
      "attempts_total": 4,
      "mock_attempts": 2,
      "aptitude_attempts": 2,
      "average_score": 63,
      "best_score": 80,
      "questions_answered": 55
    },
    "categories": [
      { "key": "quantitative", "label": "Quantitative Aptitude", "description": "...", "total": 12, "attempted": 10, "correct": 7, "accuracy": 70 }
    ],
    "mock_tests": [
      {
        "id": 1,
        "slug": "aptitude-mock-1",
        "title": "Aptitude Mock Test 1",
        "description": "...",
        "duration_minutes": 30,
        "question_count": 20,
        "attempts": 1,
        "best_score": 65,
        "last_attempted_at": "2026-11-13T10:00:00.000Z"
      }
    ],
    "recent_attempts": [
      {
        "id": 12,
        "mode": "mock",
        "title": "Aptitude Mock Test 1",
        "total_questions": 20,
        "correct_answers": 13,
        "score_percent": 65,
        "time_spent_seconds": 1540,
        "submitted_at": "2026-11-13T10:00:00.000Z"
      }
    ]
  }
}
```

### `GET /api/practice/aptitude/questions`

```json
{
  "data": [
    {
      "id": 1,
      "category": "quantitative",
      "difficulty": "easy",
      "prompt": "A shopkeeper marks an item 40% above its cost price and then gives a 25% discount. What is his profit percentage?",
      "options": ["5%", "10%", "15%", "20%"]
    }
  ],
  "meta": { "category": "quantitative", "requested": 10, "total_available": 12 }
}
```

### Submitting an attempt

Aptitude practice:

```json
{
  "category": "quantitative",
  "answers": [
    { "question_id": 1, "selected_option": 0 },
    { "question_id": 2, "selected_option": null }
  ],
  "time_spent_seconds": 420
}
```

Mock test: `POST /api/practice/mock-tests/:slug/attempts`

```json
{
  "answers": [
    { "question_id": 1, "selected_option": 2 }
  ],
  "time_spent_seconds": 900
}
```

- `selected_option` is 0-based and may be `null` for an unanswered question.
- Answers are always scored on the server. Unanswered questions are incorrect.
- There is no negative marking.
- Successful submissions return `201` with `{ "data": { "id": 12 }, "message": "..." }`.
- For a mock test, every question in the test is saved, so the review is complete even when some questions were left blank.

### `GET /api/practice/attempts/:id`

```json
{
  "data": {
    "id": 12,
    "mode": "mock",
    "mock_slug": "aptitude-mock-1",
    "title": "Aptitude Mock Test 1",
    "total_questions": 20,
    "correct_answers": 13,
    "score_percent": 65,
    "time_spent_seconds": 1540,
    "submitted_at": "2026-11-13T10:00:00.000Z",
    "answers": [
      {
        "question_id": 1,
        "category": "quantitative",
        "difficulty": "easy",
        "prompt": "...",
        "options": ["5%", "10%", "15%", "20%"],
        "selected_option": 0,
        "correct_option": 0,
        "is_correct": true,
        "explanation": "Let cost price be ₹100..."
      }
    ]
  }
}
```

Duration is tracked by the client and stored in `time_spent_seconds`. The server recalculates score from the submitted answers, so a client cannot submit a score directly.

---

## Roadmap

Requires a **student** session.

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/roadmap` | Latest plan or `data: null` |
| `POST` | `/api/roadmap/generate` | Generate a new plan (rule-based by default) |
| `POST` | `/api/roadmap/tasks` | Add a task to the latest plan |
| `PUT` | `/api/roadmap/tasks/:id` | Update/complete a task |
| `DELETE` | `/api/roadmap/tasks/:id` | Delete a task |

### `POST /api/roadmap/generate`

```json
{ "role": "Java Developer", "use_ai": false }
```

- `role` is optional; defaults to the profile target role. If neither exists, `400`.
- `use_ai` defaults to `false`. If `true` but no `AI_API_KEY` is configured, the rule engine is used with an `ai_warning`.
- Generating creates a new plan; previous plans remain in the database but the latest is shown.

**201 Created**

```json
{
  "data": {
    "id": 5,
    "user_id": 2,
    "target_role": "Java Developer",
    "generated_by": "rule",
    "summary": "A four-week Java Developer plan generated from your profile ...",
    "created_at": "...",
    "tasks": [
      {
        "id": 51,
        "title": "Revise DSA patterns: arrays, hashing and two pointers",
        "description": "...",
        "resource_url": "https://neetcode.io/roadmap",
        "priority": "high",
        "target_date": "2026-10-29",
        "is_completed": false,
        "is_overdue": false,
        "skill_name": "Data Structures and Algorithms",
        "topic_slug": "dsa",
        "topic_title": "Data Structures and Algorithms"
      }
    ],
    "progress": { "total": 9, "completed": 0, "percent": 0, "overdue": 0 }
  },
  "meta": {
    "generated_by": "rule",
    "ai_warning": null,
    "ai_configured": false,
    "note": "Dates are editable. This is a preparation recommendation, not a guarantee of placement."
  },
  "message": "Roadmap generated from your skill gaps."
}
```

### Tasks

Create:

```json
{
  "title": "Mock interview with a peer",
  "description": "45-minute coding plus project questions.",
  "resource_url": "https://www.pramp.com/",
  "priority": "medium",
  "target_date": "2026-11-10"
}
```

`title` 3–220; `target_date` required `YYYY-MM-DD`; `priority` is `high|medium|low`. A plan must exist (`400` otherwise).

Update accepts any subset of `title`, `description`, `resource_url`, `priority`, `target_date`, `is_completed`. Completing a task clears/sets `completed_at` accordingly; `is_overdue` is recalculated.

Response shapes: `{ "data": task, "message": "..." }`; delete returns `{ "message": "Roadmap task deleted." }`.

---

## Applications

Requires a **student** session.

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/applications` | All tracked applications with opportunity summary |
| `GET` | `/api/applications/upcoming?days=30` | Upcoming assessment/interview/deadline events |
| `POST` | `/api/applications` | Add an opportunity to the tracker |
| `PUT` | `/api/applications/:id` | Update status/dates/notes |
| `DELETE` | `/api/applications/:id` | Remove from tracker |

### `GET /api/applications`

```json
{
  "data": [
    {
      "id": 9,
      "status": "interview",
      "applied_date": "2026-10-01",
      "assessment_date": "2026-10-12 10:00:00",
      "interview_date": "2026-10-30 14:30:00",
      "notes": "Prepare system design examples.",
      "created_at": "...",
      "updated_at": "...",
      "opportunity": {
        "id": 3,
        "title": "Software Engineering Intern",
        "company": "PixelWorks Labs",
        "type": "internship",
        "location": "Bengaluru",
        "work_mode": "hybrid",
        "salary_stipend": "₹25,000 / month",
        "application_deadline": "2026-11-20",
        "is_sample": true,
        "is_active": true
      }
    }
  ],
  "meta": { "statuses": ["interested", "applied", "assessment", "interview", "selected", "rejected"] }
}
```

Ordered by active pipeline stage, then most recently updated.

### `POST /api/applications`

```json
{
  "opportunity_id": 3,
  "status": "interested",
  "applied_date": null,
  "assessment_date": null,
  "interview_date": null,
  "notes": "Referred by a senior."
}
```

- `opportunity_id` required.
- `status` defaults to `interested`.
- Setting `status: "applied"` without `applied_date` automatically sets today's date.
- One application per student/opportunity; duplicates return `409`.
- **201** with `{ "data": { ...application, "title": "...", "company": "..." }, "message": "Application added to your tracker." }`.

### `PUT /api/applications/:id`

```json
{
  "status": "assessment",
  "assessment_date": "2026-11-02T10:00:00.000Z",
  "notes": "Aptitude + coding, 90 minutes."
}
```

At least one field required. `applied_date` is date-only; assessment/interview accept date-time strings or null. Returns the raw updated application row with opportunity `title`/`company`.

### `GET /api/applications/upcoming`

`days` is 1–90 (default 30). Returns sorted events for tracked/bookmarked items:

```json
{
  "data": [
    {
      "event_type": "interview",
      "event_at": "2026-10-30 14:30:00",
      "title": "Interview: Software Engineering Intern",
      "company": "PixelWorks Labs",
      "opportunity_id": 3,
      "application_id": 9,
      "link": "/applications"
    },
    {
      "event_type": "deadline",
      "event_at": "2026-11-20T23:59:00",
      "title": "Application deadline: Software Engineering Intern",
      "company": "PixelWorks Labs",
      "opportunity_id": 3,
      "application_id": 9,
      "link": "/opportunities/3"
    }
  ],
  "meta": { "reminder_channel": "in-app only" }
}
```

---

## Notifications

Requires **any authenticated** session. Notifications are in-app only.

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/notifications` | Last 50 notifications + unread count (syncs reminders first) |
| `PATCH` | `/api/notifications/:id/read` | Mark one as read |
| `PATCH` | `/api/notifications/read-all` | Mark all as read |
| `DELETE` | `/api/notifications/:id` | Delete one |

```json
{
  "data": [
    {
      "id": 12,
      "type": "deadline",
      "title": "Deadline in 3 days: Software Engineering Intern",
      "message": "PixelWorks Labs closes applications in 3 days (2026-11-20). ...",
      "link": "/opportunities/3",
      "due_at": "2026-11-20 09:00:00",
      "is_read": false,
      "created_at": "..."
    }
  ],
  "meta": {
    "unread": 1,
    "channel": "in-app only",
    "note": "Email and SMS reminders are not configured. These reminders appear inside the dashboard."
  }
}
```

Reminders are generated for bookmarked/tracked deadlines inside `DEADLINE_REMINDER_DAYS` and assessments/interviews in the next 14 days. A `dedupe_key` prevents duplicates. Updating a mark on a missing/unowned notification returns `404`; deleting is idempotent.

---

## Dashboard and analytics

Requires a **student** session.

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/dashboard` | Aggregated student overview |
| `GET` | `/api/analytics` | Chart data for preparation, applications, eligibility, and skills |

### `GET /api/dashboard`

```json
{
  "data": {
    "opportunities": {
      "total": 14,
      "eligible": 5,
      "not_eligible": 7,
      "needs_info": 2,
      "internships": 9,
      "placements": 5
    },
    "applications": {
      "interested": 2,
      "applied": 1,
      "assessment": 0,
      "interview": 1,
      "selected": 0,
      "rejected": 0,
      "total": 4,
      "recent": []
    },
    "preparation": {
      "topics_total": 18,
      "topics_completed": 5,
      "completion_percent": 28,
      "practice_tasks_total": 120,
      "practice_tasks_completed": 34,
      "roadmap": { "id": 5, "target_role": "Java Developer", "progress": { "total": 9, "completed": 2, "percent": 22, "overdue": 0 }, "generated_at": "..." }
    },
    "profile_completion": 83,
    "upcoming_deadlines": [
      { "id": 3, "title": "Software Engineering Intern", "company": "PixelWorks Labs", "application_deadline": "2026-11-20", "days_left": 24, "type": "internship", "eligibility_status": "eligible" }
    ],
    "upcoming_events": [],
    "skill_gap": { "role": "Java Developer", "readiness": 56, "gaps": [], "summary": {}, "caveat": "..." },
    "notifications_unread": 1,
    "next_steps": [
      { "title": "Close your DSA gap", "description": "...", "link": "/preparation/dsa", "priority": "high", "icon": "skillgap" }
    ],
    "meta": {
      "generated_at": "...",
      "opportunities_notice": "Counts use active sample opportunities whose deadline has not passed.",
      "reminders": "In-app reminders only. Email/SMS is not configured."
    }
  }
}
```

### `GET /api/analytics`

```json
{
  "data": {
    "preparation": {
      "completion_percent": 28,
      "topics_total": 18,
      "topics_completed": 5,
      "topics_pending": 13,
      "categories": [{ "category": "DSA", "total": 3, "completed": 1 }],
      "completed": [{ "title": "Arrays", "category": "DSA", "slug": "dsa", "completed_at": "..." }],
      "pending": [{ "title": "Graphs", "category": "DSA", "slug": "dsa" }],
      "roadmap": { "total": 9, "completed": 2, "percent": 22, "overdue": 0 }
    },
    "applications": {
      "counts": { "interested": 2, "applied": 1, "assessment": 0, "interview": 1, "selected": 0, "rejected": 0, "total": 4 },
      "funnel": [{ "status": "interested", "count": 2 }],
      "conversion_rate": 25
    },
    "eligibility": {
      "counts": { "total": 14, "eligible": 5, "not_eligible": 7, "needs_info": 2 },
      "by_type": { "internship": 9, "placement": 5, "job": 0 }
    },
    "skills": {
      "total": 10,
      "by_category": [{ "category": "programming", "count": 4, "avg_proficiency": 3.5 }],
      "target_role": "Java Developer",
      "readiness": 56,
      "required_gaps": 4,
      "top_gaps": [{ "name": "Spring Boot", "priority": "high", "status": "missing", "current": null, "required": 3 }]
    },
    "weekly": [
      {
        "week": "05 Oct",
        "week_start": "2026-10-05",
        "topics_completed": 1,
        "practice_tasks_completed": 3,
        "roadmap_tasks_completed": 1,
        "preparation_activity": 5,
        "applications": 2,
        "skills_added": 1,
        "skills_cumulative": 10
      }
    ],
    "meta": {
      "generated_at": "...",
      "weeks": 8,
      "caveat": "Charts use records stored in this application. Skill levels are self-reported, not tested scores.",
      "sample_data_notice": "Opportunity eligibility counts are based on active sample opportunities."
    }
  }
}
```

`weekly` always contains eight buckets ending with the current week (Monday–Sunday, UTC). Conversion rate counts assessment + interview + selected divided by total applications.

---

## Admin

All routes require an **admin** session. Admin responses often reuse student-visible shapes but include management metadata.

### Dashboard and students

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/admin/stats` | Placement-cell overview |
| `GET` | `/api/admin/students?search=&status=&page=&limit=` | Paginated students |
| `GET` | `/api/admin/students/:id` | Full student detail |
| `PATCH` | `/api/admin/students/:id/status` | Activate/deactivate |

Student query: `search` (name/email/college/branch), `status` (`active`/`inactive`), `page`, `limit` (max 50).

**`GET /api/admin/stats`**

```json
{
  "data": {
    "students": { "total": 24, "active": 22 },
    "opportunities": { "total": 15, "active": 15, "open": 14 },
    "applications": { "total": 37, "by_status": { "interested": 8, "applied": 10, "assessment": 5, "interview": 4, "selected": 2, "rejected": 8 } },
    "preparation": { "topics_total": 18, "avg_completion_percent": 31 },
    "upcoming_deadlines": [
      { "id": 3, "title": "Software Engineering Intern", "company": "PixelWorks Labs", "application_deadline": "2026-11-20", "applications_count": 6 }
    ],
    "recent_applications": [
      { "id": 9, "status": "interview", "created_at": "...", "student_name": "Aarav Sharma", "student_email": "demo.student@example.com", "title": "Software Engineering Intern", "company": "PixelWorks Labs" }
    ],
    "top_skills": [{ "name": "Java", "student_count": 9 }],
    "meta": { "sample_notice": "Seeded opportunities are sample data, not verified live openings." }
  }
}
```

**`GET /api/admin/students`**

```json
{
  "data": [
    {
      "id": 2,
      "name": "Aarav Sharma",
      "email": "demo.student@example.com",
      "is_active": true,
      "created_at": "...",
      "college": "Sunrise Institute of Technology",
      "branch": "CSE",
      "graduation_year": 2027,
      "cgpa": "7.80",
      "target_role": "Java Developer",
      "skills_count": 10,
      "applications_count": 4,
      "bookmarks_count": 2,
      "resumes_count": 1,
      "topics_completed": 5,
      "preparation_percent": 28
    }
  ],
  "pagination": { "total": 1, "page": 1, "limit": 10, "pages": 1 }
}
```

**`GET /api/admin/students/:id`** adds `skills`, `projects`, `certifications`, `applications`, `preparation`, and the last 10 `notes`.

**`PATCH /api/admin/students/:id/status`**

```json
{ "is_active": false }
```

Returns `{ "message": "Student account deactivated." }`. Deactivation blocks future auth and invalidates active sessions on their next request. `404` if the ID is not a student.

### Opportunities

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/admin/opportunities?search=&type=&status=&page=&limit=` | Paginated management list |
| `GET` | `/api/admin/opportunities/:id` | Detail including inactive records |
| `POST` | `/api/admin/opportunities` | Create |
| `PUT` | `/api/admin/opportunities/:id` | Replace |
| `DELETE` | `/api/admin/opportunities/:id` | Delete |
| `GET` | `/api/admin/opportunity-meta` | Skill/branch/batch options |

`status` is `active` or `inactive`. The list adds `application_count`.

**Payload for create/update**

```json
{
  "title": "Backend Engineering Intern",
  "company": "Example Systems",
  "type": "internship",
  "location": "Pune",
  "work_mode": "hybrid",
  "salary_stipend": "₹30,000 / month",
  "description": "Build and test internal APIs with mentorship. This is a sufficiently detailed description.",
  "min_cgpa": 7.0,
  "openings": 3,
  "application_deadline": "2026-12-15",
  "other_requirements": "Portfolio or GitHub profile preferred.",
  "branches": ["CSE", "IT"],
  "batches": [2027],
  "skills": [
    { "skill_id": 1, "importance": "required", "min_proficiency": 3 },
    { "name": "Docker", "importance": "preferred", "min_proficiency": 2 }
  ],
  "requirements": [
    { "type": "max_backlogs", "value": 1, "label": "At most one active backlog" },
    { "type": "min_tenth_percentage", "value": 75 }
  ],
  "is_active": true,
  "is_sample": true
}
```

Rules:

- `title` 3–180, `company` 2–180, `location` 2–150.
- `description` 30–8,000 characters.
- `application_deadline` required `YYYY-MM-DD`.
- `min_cgpa` 0–10 or null; `openings` ≥1 or null.
- `skills`: max 30; each needs `skill_id` **or** `name`. Importance `required`/`preferred`; proficiency 1–5. Unknown names are created as `concept`.
- `requirements`: max 6; types `max_backlogs`, `min_tenth_percentage`, `min_twelfth_percentage`; value 0–100.
- `branches`: max 30; `batches`: max 15, years 2000–2100.
- `is_sample` defaults to `true`; set `false` only for internal, non-sample records.
- Child rows (branches/batches/skills/requirements) are replaced on update.

`DELETE` removes the opportunity. Child rows, bookmarks, and tracked applications reference it with `ON DELETE CASCADE`, so this is permanent and also removes students' application records for that opportunity.

**`GET /api/admin/opportunity-meta`**

```json
{
  "data": {
    "skills": [{ "id": 1, "name": "Java", "category": "programming" }],
    "branches": ["CSE", "IT"],
    "batches": [2026, 2027]
  }
}
```

### Application analytics and skill-gap trends

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/admin/applications/stats` | Status totals, per-opportunity breakdown, weekly trend |
| `GET` | `/api/admin/skill-gaps?role=Java%20Developer` | Aggregate gaps by target role |

Application stats return `total`, `by_status`, `by_opportunity[]`, and `weekly[]` (`week`, `week_start`, `count`).

Skill-gap trends return:

```json
{
  "data": {
    "roles": [{ "role_name": "Java Developer", "students": 8 }],
    "trends": [
      {
        "role_name": "Java Developer",
        "skill_name": "Spring Boot",
        "importance": "required",
        "required_proficiency": 3,
        "students_with_role": 8,
        "students_missing": 6,
        "gap_percent": 75
      }
    ],
    "meta": { "basis": "Compares each student's confirmed, self-rated skills with the configured requirements ..." }
  }
}
```

### Learning resources and topics

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/admin/resources` | All resources with optional topic title |
| `POST` | `/api/admin/resources` | Create |
| `PUT` | `/api/admin/resources/:id` | Update |
| `DELETE` | `/api/admin/resources/:id` | Delete |
| `GET` | `/api/admin/topics` | Active preparation topics (id, slug, title, category) |

**Payload**

```json
{
  "title": "Spring Boot Getting Started",
  "url": "https://spring.io/guides/gs/spring-boot",
  "provider": "Spring",
  "resource_type": "docs",
  "is_free": true,
  "topic_id": 9
}
```

- `title` 3–200; `url` valid URL max 500.
- `resource_type`: `docs`, `course`, `video`, `practice`, `article` (default `article`).
- `is_free` defaults to `true`; `topic_id` may be positive, null, or empty.
- Create returns `201` with the row; update returns the updated row; delete returns a message.

---

## Enumerations

| Name | Values |
| --- | --- |
| Role | `student`, `admin` |
| Opportunity type | `internship`, `placement`, `job` |
| Work mode | `onsite`, `remote`, `hybrid` |
| Eligibility status | `eligible`, `not_eligible`, `needs_info` |
| Requirement type | `max_backlogs`, `min_tenth_percentage`, `min_twelfth_percentage` |
| Skill importance | `required`, `preferred` |
| Skill source | `manual`, `resume` |
| Application status | `interested`, `applied`, `assessment`, `interview`, `selected`, `rejected` |
| Task priority | `high`, `medium`, `low` |
| Resource type | `docs`, `course`, `video`, `practice`, `article` |
| Notification type | `system`, `deadline`, `assessment`, `interview` |
| Resume status | `processed`, `failed` |

---

## Rate limits and upload constraints

| Scope | Limit |
| --- | --- |
| `/api/auth/register`, `/api/auth/login` | 30 requests / 15 minutes / IP |
| `/api/resume/upload` | 15 requests / hour / IP |
| All `/api` routes | 1,200 requests / 15 minutes / IP |

Limit responses use HTTP `429` with `{ "error": { "message": "Too many requests. Please try again shortly." } }` (auth endpoints have their own message).

Resume uploads:

- Field name: `resume`
- One file per request
- `.pdf` extension and PDF MIME type required
- `MAX_RESUME_MB` (default 5 MB)
- Parsed in memory; files are not kept on disk
