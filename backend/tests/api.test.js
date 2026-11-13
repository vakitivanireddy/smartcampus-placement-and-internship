const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/db/pool');

const unique = Date.now();
const testEmail = `journey-${unique}@example.com`;
const testPassword = 'Testpass123';
let testUserId = null;
let student;
let admin;

function resumeFixture() {
  return fs.readFileSync(path.join(__dirname, 'fixtures', 'sample-resume.pdf'));
}

after(async () => {
  if (testUserId) await pool.query('DELETE FROM users WHERE id = ?', [testUserId]);
  await pool.end();
});

test('API journey: auth, eligibility, tracking, resume, roadmap, admin', async (t) => {
  await t.test('health endpoint is public', async () => {
    const res = await request(app).get('/api/health').expect(200);
    assert.equal(res.body.status, 'ok');
  });

  await t.test('private endpoints reject anonymous users', async () => {
    await request(app).get('/api/dashboard').expect(401);
    await request(app).get('/api/admin/stats').expect(401);
  });

  await t.test('student registration creates an authenticated session', async () => {
    student = request.agent(app);
    const res = await student.post('/api/auth/register').send({
      name: 'Journey Test Student',
      email: testEmail,
      password: testPassword,
      college: 'Test Institute',
      branch: 'CSE',
      graduationYear: 2027,
      cgpa: 8.4,
      targetRole: 'Java Developer',
    }).expect(201);
    testUserId = res.body.data.user.id;
    assert.equal(res.body.data.user.role, 'student');
    assert.equal(res.body.data.user.email, testEmail);
  });

  await t.test('email uniqueness is enforced', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Duplicate', email: testEmail, password: testPassword,
    }).expect(409);
    assert.match(res.body.error.message, /already exists/i);
  });

  await t.test('student cannot access admin routes', async () => {
    await student.get('/api/admin/stats').expect(403);
  });

  await t.test('catalogue, opportunities and computed eligibility are available', async () => {
    const res = await student.get('/api/opportunities?limit=5&sort=deadline_asc').expect(200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length > 0);
    assert.equal(res.body.data[0].is_sample, true);
    assert.ok(['eligible', 'not_eligible', 'needs_info'].includes(res.body.data[0].eligibility.status));
    assert.ok(res.body.pagination.total >= res.body.data.length);
    const all = await student.get('/api/opportunities?limit=50&include_expired=true').expect(200);
    assert.ok(all.body.data.some((opp) => opp.is_expired));
  });

  await t.test('eligibility recalculates when profile changes', async () => {
    const detail = await student.get('/api/opportunities/1').expect(200);
    const opp = detail.body.data;
    assert.equal(opp.eligibility.status, 'needs_info');
    await student.put('/api/profile').send({
      name: 'Journey Test Student',
      college: 'Test Institute',
      branch: opp.branches[0],
      graduation_year: opp.batches[0],
      cgpa: 9.5,
      active_backlogs: 0,
      tenth_percentage: 95,
      twelfth_percentage: 92,
      target_role: 'Java Developer',
      preferred_roles: ['Java Developer'],
    }).expect(200);

    const required = opp.skills.filter((skill) => skill.importance === 'required');
    for (const skill of required) {
      await student.post('/api/profile/skills').send({
        skill_id: skill.skill_id, proficiency: 5,
      }).expect(201);
    }
    const afterSkills = await student.get('/api/opportunities/1').expect(200);
    assert.equal(afterSkills.body.data.eligibility.status, 'eligible');

    await student.put('/api/profile').send({
      name: 'Journey Test Student',
      college: 'Test Institute',
      branch: opp.branches[0],
      graduation_year: opp.batches[0],
      cgpa: 1,
      active_backlogs: 0,
      tenth_percentage: 95,
      twelfth_percentage: 92,
      target_role: 'Java Developer',
      preferred_roles: ['Java Developer'],
    }).expect(200);
    const lowCgpa = await student.get('/api/opportunities/1/eligibility').expect(200);
    assert.equal(lowCgpa.body.data.status, 'not_eligible');
    assert.ok(lowCgpa.body.data.reasons.some((reason) => /CGPA/i.test(reason.message)));
  });

  await t.test('bookmark and application tracking persist', async () => {
    const opps = await student.get('/api/opportunities?limit=1').expect(200);
    const oppId = opps.body.data[0].id;
    const bookmark = await student.post(`/api/opportunities/${oppId}/bookmark`).expect(201);
    assert.equal(bookmark.body.data.bookmarked, true);
    const list = await student.get('/api/opportunities/bookmarks').expect(200);
    assert.ok(list.body.data.some((opp) => opp.id === oppId));

    const created = await student.post('/api/applications').send({
      opportunity_id: oppId, status: 'applied', notes: 'Journey test application',
    }).expect(201);
    const appId = created.body.data.id;
    const updated = await student.put(`/api/applications/${appId}`).send({
      status: 'interview', interview_date: '2030-01-10T10:00',
    }).expect(200);
    assert.equal(updated.body.data.status, 'interview');
    const apps = await student.get('/api/applications').expect(200);
    assert.ok(apps.body.data.some((app) => app.id === appId && app.status === 'interview'));
    await student.delete(`/api/applications/${appId}`).expect(200);
    await student.post(`/api/opportunities/${oppId}/bookmark`).expect(200);
  });

  await t.test('skill gap distinguishes required and preferred skills', async () => {
    const res = await student.get('/api/skill-gap?role=Java Developer').expect(200);
    assert.equal(res.body.data.role, 'Java Developer');
    assert.ok(Array.isArray(res.body.data.items));
    assert.ok(res.body.data.items.some((item) => item.importance === 'required'));
    assert.ok(res.body.data.items.every((item) => item.self_reported === true));
    assert.ok(res.body.data.readiness >= 0 && res.body.data.readiness <= 100);
  });

  await t.test('preparation progress and notes persist', async () => {
    const topics = await student.get('/api/preparation/topics').expect(200);
    const topic = topics.body.data[0];
    const updated = await student.put(`/api/preparation/topics/${topic.id}/progress`).send({ completed: true }).expect(200);
    assert.equal(updated.body.data.completed, true);
    const note = await student.post(`/api/preparation/topics/${topic.id}/notes`).send({
      title: 'Journey note', body: 'Reviewed arrays and hashing patterns.',
    }).expect(201);
    const detail = await student.get(`/api/preparation/topics/${topic.slug}`).expect(200);
    assert.ok(detail.body.data.notes.some((item) => item.id === note.body.data.id));
    const task = detail.body.data.tasks[0];
    await student.put(`/api/preparation/tasks/${task.id}/progress`).send({ completed: true }).expect(200);
    await student.delete(`/api/preparation/notes/${note.body.data.id}`).expect(200);
  });

  await t.test('aptitude practice and mock tests are scored and reviewable', async () => {
    const overview = await student.get('/api/practice/overview').expect(200);
    assert.ok(overview.body.data.mock_tests.length >= 1);
    assert.ok(overview.body.data.categories.some((category) => category.key === 'quantitative'));

    const questions = await student.get('/api/practice/aptitude/questions?category=logical&limit=5').expect(200);
    assert.equal(questions.body.data.length, 5);
    assert.ok(questions.body.data.every((question) => question.category === 'logical'));
    assert.equal(Object.prototype.hasOwnProperty.call(questions.body.data[0], 'correct_option'), false);

    const aptitude = await student.post('/api/practice/aptitude/attempts').send({
      category: 'logical',
      answers: questions.body.data.map((question, index) => ({
        question_id: question.id, selected_option: index % 4,
      })),
      time_spent_seconds: 240,
    }).expect(201);
    const aptitudeReview = await student.get(`/api/practice/attempts/${aptitude.body.data.id}`).expect(200);
    assert.equal(aptitudeReview.body.data.mode, 'aptitude');
    assert.equal(aptitudeReview.body.data.answers.length, 5);
    assert.ok(aptitudeReview.body.data.answers[0].explanation.length > 10);

    const mock = await student.get('/api/practice/mock-tests/aptitude-mock-1').expect(200);
    assert.ok(mock.body.data.questions.length >= 10);
    const mockAttempt = await student.post('/api/practice/mock-tests/aptitude-mock-1/attempts').send({
      answers: mock.body.data.questions.map((question) => ({
        question_id: question.id, selected_option: 0,
      })),
      time_spent_seconds: 900,
    }).expect(201);
    const mockReview = await student.get(`/api/practice/attempts/${mockAttempt.body.data.id}`).expect(200);
    assert.equal(mockReview.body.data.mode, 'mock');
    assert.equal(mockReview.body.data.total_questions, mock.body.data.questions.length);
    assert.ok(mockReview.body.data.score_percent >= 0 && mockReview.body.data.score_percent <= 100);

    const history = await student.get('/api/practice/attempts?limit=5').expect(200);
    assert.ok(history.body.data.length >= 2);
  });

  await t.test('roadmap is generated from real gaps and tasks are editable', async () => {
    const generated = await student.post('/api/roadmap/generate').send({ role: 'Java Developer' }).expect(201);
    assert.equal(generated.body.data.generated_by, 'rule');
    assert.ok(generated.body.data.tasks.length >= 5);
    const task = generated.body.data.tasks[0];
    const updated = await student.put(`/api/roadmap/tasks/${task.id}`).send({ is_completed: true }).expect(200);
    assert.equal(updated.body.data.is_completed, 1);
    const latest = await student.get('/api/roadmap').expect(200);
    assert.ok(latest.body.data.progress.percent > 0);
  });

  await t.test('resume upload extracts text and skills and can be imported', async () => {
    const pdf = resumeFixture();
    const res = await student.post('/api/resume/upload')
      .attach('resume', pdf, { filename: 'journey.pdf', contentType: 'application/pdf' });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal(res.body.data.resume.status, 'processed');
    assert.ok(res.body.data.resume.extracted_text.includes('Technical Skills'));
    assert.ok(res.body.data.suggestions.some((skill) => skill.name === 'Java'));
    const skill = res.body.data.suggestions.find((item) => item.name === 'Java');
    await student.post(`/api/resume/${res.body.data.resume.id}/import-skills`)
      .send({ skills: [{ name: skill.name, proficiency: 4 }] })
      .expect(200);
    const profile = await student.get('/api/profile').expect(200);
    assert.ok(profile.body.data.user.skills.some((item) => item.name === 'Java'));
  });

  await t.test('resume upload rejects non-PDF files', async () => {
    const res = await student.post('/api/resume/upload')
      .attach('resume', Buffer.from('not a pdf'), { filename: 'resume.txt', contentType: 'text/plain' })
      .expect(400);
    assert.match(res.body.error.message, /PDF/i);
  });

  await t.test('dashboard and analytics use database records', async () => {
    const dashboard = await student.get('/api/dashboard').expect(200);
    assert.equal(typeof dashboard.body.data.opportunities.total, 'number');
    assert.equal(typeof dashboard.body.data.preparation.completion_percent, 'number');
    assert.ok(dashboard.body.data.meta.reminders.includes('In-app'));
    const analytics = await student.get('/api/analytics').expect(200);
    assert.ok(analytics.body.data.weekly.length === 8);
    assert.ok(analytics.body.data.applications.funnel.length === 6);
    assert.ok(analytics.body.data.preparation.categories.length > 0);
  });

  await t.test('reminders are in-app only and can be marked read', async () => {
    const notifications = await student.get('/api/notifications').expect(200);
    assert.equal(notifications.body.meta.channel, 'in-app only');
    if (notifications.body.data.length > 0) {
      await student.patch(`/api/notifications/${notifications.body.data[0].id}/read`).expect(200);
    }
    await student.patch('/api/notifications/read-all').expect(200);
  });

  await t.test('admin can authenticate, manage students and CRUD opportunities', async () => {
    admin = request.agent(app);
    const login = await admin.post('/api/auth/login').send({
      email: 'placement.cell@example.com', password: 'Admin@123',
    }).expect(200);
    assert.equal(login.body.data.user.role, 'admin');

    const studentList = await admin.get('/api/admin/students?limit=5').expect(200);
    assert.ok(studentList.body.data.some((row) => row.email === testEmail));
    const stats = await admin.get('/api/admin/stats').expect(200);
    assert.ok(stats.body.data.students.total >= 1);
    await admin.get('/api/admin/applications/stats').expect(200);
    await admin.get('/api/admin/skill-gaps').expect(200);

    const meta = await admin.get('/api/admin/opportunity-meta').expect(200);
    assert.ok(meta.body.data.skills.length > 0);
    assert.ok(meta.body.data.branches.length > 0);
    assert.ok(meta.body.data.batches.length > 0);

    const payload = {
      title: 'Journey Test Internship',
      company: 'Journey Test Co',
      type: 'internship',
      location: 'Remote',
      work_mode: 'remote',
      salary_stipend: '₹10,000 / month',
      description: 'A clearly labelled test opportunity created by the API journey test. It is used to verify admin CRUD behaviour.',
      min_cgpa: 6.5,
      openings: 1,
      application_deadline: '2030-12-31',
      branches: ['CSE'],
      batches: [2027],
      skills: [{ name: 'Java', importance: 'required', min_proficiency: 2 }],
      requirements: [{ type: 'max_backlogs', value: 0, label: 'No active backlogs' }],
      is_sample: true,
    };
    const created = await admin.post('/api/admin/opportunities').send(payload).expect(201);
    const id = created.body.data.id;
    assert.equal(created.body.data.title, payload.title);
    const updated = await admin.put(`/api/admin/opportunities/${id}`).send({ ...payload, title: 'Journey Updated Internship' }).expect(200);
    assert.equal(updated.body.data.title, 'Journey Updated Internship');
    await admin.delete(`/api/admin/opportunities/${id}`).expect(200);
    await admin.get(`/api/admin/opportunities/${id}`).expect(404);
  });

  await t.test('admin can manage learning resources', async () => {
    const created = await admin.post('/api/admin/resources').send({
      title: 'Journey Resource', url: 'https://developer.mozilla.org/en-US/docs/Learn_web_development',
      provider: 'MDN', resource_type: 'docs', is_free: true, topic_id: 7,
    }).expect(201);
    const id = created.body.data.id;
    await admin.put(`/api/admin/resources/${id}`).send({
      title: 'Journey Resource Updated', url: 'https://developer.mozilla.org/en-US/docs/Learn_web_development',
      provider: 'MDN', resource_type: 'docs', is_free: true, topic_id: 7,
    }).expect(200);
    await admin.delete(`/api/admin/resources/${id}`).expect(200);
  });

  await t.test('admin cannot access student-only data', async () => {
    await admin.get('/api/dashboard').expect(403);
    await admin.get('/api/opportunities').expect(403);
  });
});
