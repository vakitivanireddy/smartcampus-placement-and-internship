const { query } = require('../db/pool');
const { listApplications, getUpcomingEvents } = require('../services/applicationService');
const { notFound, conflict, badRequest } = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');

function toSqlDateTime(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw badRequest('One of the date/time values is invalid.');
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

const list = asyncHandler(async (req, res) => {
  const data = await listApplications(req.user.id);
  res.json({ data, meta: { statuses: ['interested', 'applied', 'assessment', 'interview', 'selected', 'rejected'] } });
});

const create = asyncHandler(async (req, res) => {
  const body = req.body;
  const oppRows = await query('SELECT id, title FROM opportunities WHERE id = ?', [body.opportunity_id]);
  if (!oppRows[0]) throw notFound('Opportunity not found.');
  const existing = await query(
    'SELECT id FROM applications WHERE user_id = ? AND opportunity_id = ?',
    [req.user.id, body.opportunity_id],
  );
  if (existing[0]) {
    throw conflict('This opportunity is already in your application tracker. Update its status instead.');
  }

  const appliedDate = body.applied_date || (body.status === 'applied' ? new Date().toISOString().slice(0, 10) : null);
  const result = await query(
    `INSERT INTO applications (user_id, opportunity_id, status, applied_date, assessment_date, interview_date, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      req.user.id, body.opportunity_id, body.status, appliedDate,
      toSqlDateTime(body.assessment_date), toSqlDateTime(body.interview_date), body.notes || null,
    ],
  );
  const rows = await query(
    `SELECT a.*, o.title, o.company FROM applications a JOIN opportunities o ON o.id = a.opportunity_id
     WHERE a.id = ? AND a.user_id = ?`,
    [result.insertId, req.user.id],
  );
  res.status(201).json({ data: rows[0], message: 'Application added to your tracker.' });
});

const update = asyncHandler(async (req, res) => {
  const existing = await query('SELECT * FROM applications WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!existing[0]) throw notFound('Application not found.');
  const body = req.body;
  const fields = [];
  const params = [];
  if (body.status !== undefined) {
    fields.push('status = ?');
    params.push(body.status);
  }
  if (body.applied_date !== undefined) {
    fields.push('applied_date = ?');
    params.push(body.applied_date || null);
  }
  if (body.assessment_date !== undefined) {
    fields.push('assessment_date = ?');
    params.push(toSqlDateTime(body.assessment_date));
  }
  if (body.interview_date !== undefined) {
    fields.push('interview_date = ?');
    params.push(toSqlDateTime(body.interview_date));
  }
  if (body.notes !== undefined) {
    fields.push('notes = ?');
    params.push(body.notes || null);
  }
  if (fields.length === 0) throw badRequest('Nothing to update.');
  if (body.status === 'applied' && !existing[0].applied_date && body.applied_date === undefined) {
    fields.push('applied_date = ?');
    params.push(new Date().toISOString().slice(0, 10));
  }
  params.push(req.params.id, req.user.id);
  await query(`UPDATE applications SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`, params);
  const rows = await query(
    `SELECT a.*, o.title, o.company FROM applications a JOIN opportunities o ON o.id = a.opportunity_id
     WHERE a.id = ? AND a.user_id = ?`,
    [req.params.id, req.user.id],
  );
  res.json({ data: rows[0], message: 'Application updated.' });
});

const remove = asyncHandler(async (req, res) => {
  await query('DELETE FROM applications WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  res.json({ message: 'Application removed.' });
});

const upcoming = asyncHandler(async (req, res) => {
  const events = await getUpcomingEvents(req.user.id, req.query.days || 30);
  res.json({ data: events, meta: { reminder_channel: 'in-app only' } });
});

module.exports = { list, create, update, remove, upcoming };
