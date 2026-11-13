const { query } = require('../db/pool');
const opportunityService = require('../services/opportunityService');
const { evaluateEligibility } = require('../services/eligibilityService');
const { notFound, badRequest } = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const result = await opportunityService.listForStudent(req.user, req.query);
  res.json(result);
});

const meta = asyncHandler(async (req, res) => {
  const [locations, branches] = await Promise.all([
    query("SELECT DISTINCT location FROM opportunities WHERE is_active = 1 ORDER BY location"),
    query("SELECT DISTINCT branch FROM opportunity_branches ORDER BY branch"),
  ]);
  res.json({
    data: {
      types: [
        { value: 'internship', label: 'Internship' },
        { value: 'placement', label: 'Placement' },
        { value: 'job', label: 'Job' },
      ],
      work_modes: [
        { value: 'onsite', label: 'On-site' },
        { value: 'remote', label: 'Remote' },
        { value: 'hybrid', label: 'Hybrid' },
      ],
      locations: locations.map((row) => row.location),
      branches: branches.map((row) => row.branch),
    },
    meta: { notice: 'Every seeded opportunity is sample data, not a verified live opening.' },
  });
});

const detail = asyncHandler(async (req, res) => {
  const opportunity = await opportunityService.getForStudent(req.params.id, req.user);
  res.json({ data: opportunity });
});

const eligibility = asyncHandler(async (req, res) => {
  const opportunity = await opportunityService.getForStudent(req.params.id, req.user);
  res.json({ data: opportunity.eligibility, meta: { recalculated_at: new Date().toISOString() } });
});

const toggleBookmark = asyncHandler(async (req, res) => {
  const opp = await query('SELECT id, title FROM opportunities WHERE id = ? AND is_active = 1', [req.params.id]);
  if (!opp[0]) throw notFound('Opportunity not found.');
  const existing = await query(
    'SELECT id FROM bookmarks WHERE user_id = ? AND opportunity_id = ?',
    [req.user.id, req.params.id],
  );
  if (existing[0]) {
    await query('DELETE FROM bookmarks WHERE id = ?', [existing[0].id]);
    return res.json({ data: { bookmarked: false }, message: 'Removed from bookmarks.' });
  }
  await query('INSERT INTO bookmarks (user_id, opportunity_id) VALUES (?, ?)', [req.user.id, req.params.id]);
  return res.status(201).json({ data: { bookmarked: true }, message: 'Saved to bookmarks.' });
});

const bookmarks = asyncHandler(async (req, res) => {
  let rows = await query(
    `SELECT o.id, o.title, o.company, o.type, o.location, o.work_mode, o.salary_stipend,
            o.min_cgpa, DATE_FORMAT(o.application_deadline, '%Y-%m-%d') AS application_deadline,
            o.is_active, o.is_sample, o.created_at, b.created_at AS bookmarked_at
     FROM bookmarks b JOIN opportunities o ON o.id = b.opportunity_id
     WHERE b.user_id = ? ORDER BY o.application_deadline ASC`,
    [req.user.id],
  );
  rows = await opportunityService.attachChildren(rows);
  for (const opp of rows) {
    opp.is_bookmarked = true;
    opp.eligibility = evaluateEligibility({
      profile: req.user.profile,
      studentSkills: req.user.skills || [],
      opportunity: opp,
    });
  }
  if (rows.length === 0) return res.json({ data: [], meta: { notice: 'Sample opportunity data for demonstration.' } });
  const appRows = await query(
    `SELECT opportunity_id, status FROM applications WHERE user_id = ? AND opportunity_id IN (${rows.map(() => '?').join(',')})`,
    [req.user.id, ...rows.map((opp) => opp.id)],
  );
  const appMap = new Map(appRows.map((row) => [row.opportunity_id, row.status]));
  for (const opp of rows) opp.application_status = appMap.get(opp.id) || null;
  return res.json({ data: rows, meta: { notice: 'Sample opportunity data for demonstration.' } });
});

const adminList = asyncHandler(async (req, res) => {
  const result = await opportunityService.listForAdmin(req.query);
  res.json(result);
});

const adminDetail = asyncHandler(async (req, res) => {
  const opportunity = await opportunityService.getForAdmin(req.params.id);
  res.json({ data: opportunity });
});

const adminCreate = asyncHandler(async (req, res) => {
  const id = await opportunityService.createOpportunity(req.body, req.user.id);
  const opportunity = await opportunityService.getForAdmin(id);
  res.status(201).json({ data: opportunity, message: 'Opportunity created.' });
});

const adminUpdate = asyncHandler(async (req, res) => {
  const id = await opportunityService.updateOpportunity(req.params.id, req.body);
  const opportunity = await opportunityService.getForAdmin(id);
  res.json({ data: opportunity, message: 'Opportunity updated and eligibility will be recalculated for students.' });
});

const adminDelete = asyncHandler(async (req, res) => {
  const existing = await opportunityService.getRawOpportunity(req.params.id);
  if (!existing) throw notFound('Opportunity not found.');
  await opportunityService.deleteOpportunity(req.params.id);
  res.json({ message: 'Opportunity deleted.' });
});

module.exports = {
  list, meta, detail, eligibility, toggleBookmark, bookmarks,
  adminList, adminDetail, adminCreate, adminUpdate, adminDelete,
};
