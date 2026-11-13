# Postman collection

Files:

- `smart-placement.postman_collection.json` — 61 requests covering health, auth, student, admin, and sign-out.
- `smart-placement-local.postman_environment.json` — local base URL and demo credentials.

## Import

1. Open Postman → **Import** and select both JSON files.
2. Select the **Smart Placement — Local** environment in the top-right environment selector.
3. Start the API (`cd backend && npm run dev`) and seed the database if needed (`npm run db:setup`).
4. Run the collection with the **Collection Runner**, or execute folders top to bottom.

The expected folder order is:

1. **00 · Health**
2. **01 · Auth** — registers a timestamped student, then signs in as the demo student
3. **02 · Student** — student-only endpoints
4. **03 · Admin** — signs in as the demo admin, then admin endpoints
5. **99 · Sign out**

Running folders out of order can produce `403` responses because the login cookie is shared by the collection.

## Authentication

Login sets the httpOnly `sp_token` cookie and Postman stores it in its cookie jar automatically. No bearer token is needed. If you prefer bearer auth, extract the token from the cookie outside Postman and send:

```http
Authorization: Bearer <token>
```

The API checks the cookie first, then the `Authorization` header.

## Dynamic IDs

Requests store IDs in collection variables as they run:

- Opportunity list → `opportunityId`
- Preparation topics/detail → `prepTopicId`, `practiceTaskId`
- Notes → `noteId`
- Roadmap → `roadmapTaskId`, `createdRoadmapTaskId`
- Application create → `applicationId`
- Resume upload → `resumeId`
- Admin students list → `adminStudentId`
- Admin opportunities list/create → `adminOpportunityId`, `createdOpportunityId`
- Admin topics/create resource → `resourceTopicId`, `resourceId`

If a request that creates an ID fails, later requests that depend on it will fail too; fix the earlier failure first.

## Manual steps

- **Upload resume PDF** is the only request that needs a file. Select a text-based PDF in the request body before sending. The seeded API also accepts a copy of `backend/tests/fixtures/sample-resume.pdf`. If you run the whole collection without attaching a file, that request returns `400` and `Import extracted skills` has no ID to use.
- **Create application** uses an opportunity without an existing tracker entry. If every opportunity is already tracked, it returns `409`; remove or change a tracker entry and rerun. The collection deletes the application it creates.
- **Bookmark** is toggled on and then off again during the run.
- **Opportunity/resource/note/roadmap task** fixtures created by the collection are deleted before the run finishes.
- **Mark all notifications read** changes notification state for the demo student.

## Sample-data caveat

Seeded opportunities are fictional sample records marked `is_sample: true`. This collection does not contact real employers or job boards. Opportunity eligibility is calculated from the seeded/edited profile and is not a hiring decision.

## Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `baseUrl` | `http://localhost:5000/api` | API base URL |
| `studentEmail` | `demo.student@example.com` | Student login |
| `studentPassword` | `Student@123` | Student password |
| `adminEmail` | `placement.cell@example.com` | Admin login |
| `adminPassword` | `Admin@123` | Admin password |

Change these values in your own environment if you use different accounts. Do not commit real credentials.

## Notes on reruns

- Registration uses a timestamped email, so it can be repeated.
- The student profile is reset to the demo values by **Update profile**, and the bio/phone are set to sample values. Use a disposable database if that matters.
- The resume upload creates a resume record; delete it from the Resume page or API if you do not want to keep the extraction.
- The demo student's target role is set to `Java Developer`, which the skill-gap and roadmap requests rely on.

See [`../docs/API.md`](../docs/API.md) for the complete endpoint reference.
