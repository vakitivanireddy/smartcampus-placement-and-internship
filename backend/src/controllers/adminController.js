const { query } = require('../db/pool');
const adminService = require('../services/adminService');
const { notFound, badRequest } = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');

const stats = asyncHandler(async (req, res) => {
  res.json({ data: await adminService.getStats() });
});

const students = asyncHandler(async (req, res) => {
  const result = await adminService.listStudents(req.query);
  res.json(result);
});

const studentDetail = asyncHandler(async (req, res) => {
  const data = await adminService.getStudentDetail(req.params.id);
  if (!data) throw notFound('Student not found.');
  res.json({ data });
});

const updateStudentStatus = asyncHandler(async (req, res) => {
  const updated = await adminService.setStudentActive(req.params.id, req.body.is_active);
  if (!updated) throw notFound('Student not found.');
  res.json({ message: req.body.is_active ? 'Student account activated.' : 'Student account deactivated.' });
});

const applicationStats = asyncHandler(async (req, res) => {
  res.json({ data: await adminService.getApplicationStats() });
});

const skillGapTrends = asyncHandler(async (req, res) => {
  res.json({ data: await adminService.getSkillGapTrends(req.query.role || '') });
});

const resources = asyncHandler(async (req, res) => {
  res.json({ data: await adminService.listResources() });
});

const topics = asyncHandler(async (req, res) => {
  res.json({ data: await adminService.listTopicsSimple() });
});

const opportunityMeta = asyncHandler(async (req, res) => {
  res.json({ data: await adminService.getOpportunityMeta() });
});

const createResource = asyncHandler(async (req, res) => {
  const { title, url, provider, resource_type, is_free, topic_id } = req.body;
  if (topic_id) {
    const topic = await query('SELECT id FROM preparation_topics WHERE id = ?', [topic_id]);
    if (!topic[0]) throw badRequest('Choose a valid preparation topic.');
  }
  const result = await query(
    `INSERT INTO learning_resources (topic_id, title, url, provider, resource_type, is_free)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [topic_id || null, title, url, provider || null, resource_type, is_free ? 1 : 0],
  );
  const rows = await query('SELECT * FROM learning_resources WHERE id = ?', [result.insertId]);
  res.status(201).json({ data: rows[0], message: 'Learning resource added.' });
});

const updateResource = asyncHandler(async (req, res) => {
  const existing = await query('SELECT id FROM learning_resources WHERE id = ?', [req.params.id]);
  if (!existing[0]) throw notFound('Learning resource not found.');
  const { title, url, provider, resource_type, is_free, topic_id } = req.body;
  await query(
    `UPDATE learning_resources SET topic_id = ?, title = ?, url = ?, provider = ?, resource_type = ?, is_free = ?
     WHERE id = ?`,
    [topic_id || null, title, url, provider || null, resource_type, is_free ? 1 : 0, req.params.id],
  );
  const rows = await query('SELECT * FROM learning_resources WHERE id = ?', [req.params.id]);
  res.json({ data: rows[0], message: 'Learning resource updated.' });
});

const deleteResource = asyncHandler(async (req, res) => {
  await query('DELETE FROM learning_resources WHERE id = ?', [req.params.id]);
  res.json({ message: 'Learning resource deleted.' });
});

module.exports = {
  stats, students, studentDetail, updateStudentStatus, applicationStats,
  skillGapTrends, resources, topics, opportunityMeta,
  createResource, updateResource, deleteResource,
};
