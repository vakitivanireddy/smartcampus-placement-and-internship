const { query, withTransaction } = require('../db/pool');
const { evaluateEligibility } = require('./eligibilityService');
const { notFound } = require('../utils/httpError');

const DETAIL_COLUMNS = `
  o.id, o.title, o.company, o.type, o.location, o.work_mode, o.salary_stipend,
  o.description, o.min_cgpa, o.openings, DATE_FORMAT(o.application_deadline, '%Y-%m-%d') AS application_deadline,
  o.other_requirements, o.is_active, o.is_sample, o.created_by, o.created_at, o.updated_at
`;

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function paginationMeta(total, page, limit) {
  return {
    total,
    page,
    limit,
    pages: Math.max(1, Math.ceil(total / limit)),
    has_next: page * limit < total,
    has_prev: page > 1,
  };
}

async function attachChildren(opportunities) {
  if (opportunities.length === 0) return opportunities;
  const ids = opportunities.map((opp) => opp.id);
  const placeholders = ids.map(() => '?').join(',');

  const [branches, batches, skills, requirements] = await Promise.all([
    query(`SELECT opportunity_id, branch FROM opportunity_branches WHERE opportunity_id IN (${placeholders}) ORDER BY branch`, ids),
    query(`SELECT opportunity_id, graduation_year FROM opportunity_batches WHERE opportunity_id IN (${placeholders}) ORDER BY graduation_year`, ids),
    query(
      `SELECT os.opportunity_id, os.skill_id, os.importance, os.min_proficiency, s.name, s.category, s.resource_url
       FROM opportunity_skills os JOIN skills s ON s.id = os.skill_id
       WHERE os.opportunity_id IN (${placeholders})
       ORDER BY os.importance = 'preferred', s.name`,
      ids,
    ),
    query(`SELECT opportunity_id, type, value, label FROM opportunity_requirements WHERE opportunity_id IN (${placeholders}) ORDER BY type`, ids),
  ]);

  const byId = new Map(opportunities.map((opp) => [opp.id, opp]));
  for (const opp of opportunities) {
    opp.branches = [];
    opp.batches = [];
    opp.skills = [];
    opp.requirements = [];
    opp.min_cgpa = opp.min_cgpa === null ? null : Number(opp.min_cgpa);
    opp.is_expired = opp.application_deadline < todayString();
    opp.is_active = Boolean(opp.is_active);
    opp.is_sample = Boolean(opp.is_sample);
  }
  for (const row of branches) byId.get(row.opportunity_id)?.branches.push(row.branch);
  for (const row of batches) byId.get(row.opportunity_id)?.batches.push(row.graduation_year);
  for (const row of skills) {
    byId.get(row.opportunity_id)?.skills.push({
      skill_id: row.skill_id,
      name: row.name,
      category: row.category,
      resource_url: row.resource_url,
      importance: row.importance,
      min_proficiency: row.min_proficiency,
    });
  }
  for (const row of requirements) {
    byId.get(row.opportunity_id)?.requirements.push({
      type: row.type,
      value: Number(row.value),
      label: row.label,
    });
  }
  return opportunities;
}

async function attachStudentState(opportunities, userId) {
  if (!userId || opportunities.length === 0) return opportunities;
  const ids = opportunities.map((opp) => opp.id);
  const placeholders = ids.map(() => '?').join(',');
  const [bookmarks, applications] = await Promise.all([
    query(`SELECT opportunity_id FROM bookmarks WHERE user_id = ? AND opportunity_id IN (${placeholders})`, [userId, ...ids]),
    query(`SELECT opportunity_id, status FROM applications WHERE user_id = ? AND opportunity_id IN (${placeholders})`, [userId, ...ids]),
  ]);
  const bookmarkSet = new Set(bookmarks.map((row) => row.opportunity_id));
  const appMap = new Map(applications.map((row) => [row.opportunity_id, row.status]));
  for (const opp of opportunities) {
    opp.is_bookmarked = bookmarkSet.has(opp.id);
    opp.application_status = appMap.get(opp.id) || null;
  }
  return opportunities;
}

function filterAndPaginate(opportunities, { filters, includeEligibility, page, limit }) {
  let rows = opportunities;

  if (filters.search) {
    const needle = filters.search.toLowerCase();
    rows = rows.filter((opp) =>
      [opp.title, opp.company, opp.location, opp.description, ...opp.skills.map((s) => s.name)]
        .join(' ')
        .toLowerCase()
        .includes(needle),
    );
  }
  if (filters.type) rows = rows.filter((opp) => opp.type === filters.type);
  if (filters.work_mode) rows = rows.filter((opp) => opp.work_mode === filters.work_mode);
  if (filters.location) {
    const needle = filters.location.toLowerCase();
    rows = rows.filter((opp) => opp.location.toLowerCase().includes(needle));
  }
  if (filters.bookmarked) rows = rows.filter((opp) => opp.is_bookmarked);
  if (includeEligibility && filters.eligibility) {
    rows = rows.filter((opp) => opp.eligibility?.status === filters.eligibility);
  }

  const sort = filters.sort || 'deadline_asc';
  const eligibilityRank = { eligible: 0, needs_info: 1, not_eligible: 2 };
  const sorters = {
    deadline_asc: (a, b) => a.application_deadline.localeCompare(b.application_deadline),
    deadline_desc: (a, b) => b.application_deadline.localeCompare(a.application_deadline),
    newest: (a, b) => new Date(b.created_at) - new Date(a.created_at),
    company_asc: (a, b) => a.company.localeCompare(b.company),
    cgpa_desc: (a, b) => (b.min_cgpa ?? -1) - (a.min_cgpa ?? -1),
    eligibility: (a, b) => (eligibilityRank[a.eligibility?.status] ?? 3) - (eligibilityRank[b.eligibility?.status] ?? 3),
  };
  rows = [...rows].sort(sorters[sort] || sorters.deadline_asc);

  const total = rows.length;
  const start = (page - 1) * limit;
  return {
    items: rows.slice(start, start + limit),
    pagination: paginationMeta(total, page, limit),
  };
}

/**
 * Returns active opportunities for a student, with fresh eligibility results.
 * Eligibility is recalculated on every request, so profile/criteria changes are
 * reflected immediately.
 */
async function listForStudent(user, filters = {}) {
  const page = Math.max(1, Number(filters.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(filters.limit) || 8));
  const params = [];
  let sql = `SELECT ${DETAIL_COLUMNS} FROM opportunities o WHERE o.is_active = 1`;
  if (!filters.include_expired) {
    sql += ' AND o.application_deadline >= CURDATE()';
  }
  if (filters.type) {
    sql += ' AND o.type = ?';
    params.push(filters.type);
  }
  if (filters.work_mode) {
    sql += ' AND o.work_mode = ?';
    params.push(filters.work_mode);
  }
  sql += ' ORDER BY o.application_deadline ASC LIMIT 500';

  let opportunities = await query(sql, params);
  opportunities = await attachChildren(opportunities);
  await attachStudentState(opportunities, user.id);

  for (const opp of opportunities) {
    opp.eligibility = evaluateEligibility({
      profile: user.profile,
      studentSkills: user.skills || [],
      opportunity: opp,
    });
  }

  const result = filterAndPaginate(opportunities, {
    filters,
    includeEligibility: true,
    page,
    limit,
  });

  return {
    data: result.items,
    pagination: result.pagination,
    meta: {
      data_notice: 'All seeded opportunities are clearly labelled sample data for demonstration, not verified live openings.',
      eligibility_recalculated: new Date().toISOString(),
    },
  };
}

async function getForStudent(id, user) {
  const rows = await query(
    `SELECT ${DETAIL_COLUMNS} FROM opportunities o WHERE o.id = ? AND o.is_active = 1 LIMIT 1`,
    [id],
  );
  if (!rows[0]) throw notFound('Opportunity not found.');
  await attachChildren(rows);
  await attachStudentState(rows, user.id);
  rows[0].eligibility = evaluateEligibility({
    profile: user.profile,
    studentSkills: user.skills || [],
    opportunity: rows[0],
  });
  return rows[0];
}

async function getEligibilitySummary(user) {
  let opportunities = await query(
    `SELECT ${DETAIL_COLUMNS} FROM opportunities o
     WHERE o.is_active = 1 AND o.application_deadline >= CURDATE()
     ORDER BY o.application_deadline ASC LIMIT 500`,
  );
  opportunities = await attachChildren(opportunities);
  const counts = { total: opportunities.length, eligible: 0, not_eligible: 0, needs_info: 0 };
  for (const opp of opportunities) {
    opp.eligibility = evaluateEligibility({
      profile: user.profile,
      studentSkills: user.skills || [],
      opportunity: opp,
    });
    counts[opp.eligibility.status] += 1;
  }
  return { counts, opportunities };
}

async function listForAdmin(filters = {}) {
  const page = Math.max(1, Number(filters.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(filters.limit) || 10));
  let sql = `SELECT ${DETAIL_COLUMNS}, COUNT(a.id) AS application_count
             FROM opportunities o
             LEFT JOIN applications a ON a.opportunity_id = o.id
             WHERE 1 = 1`;
  const params = [];
  if (filters.search) {
    sql += ' AND (o.title LIKE ? OR o.company LIKE ?)';
    params.push(`%${filters.search}%`, `%${filters.search}%`);
  }
  if (filters.type) {
    sql += ' AND o.type = ?';
    params.push(filters.type);
  }
  if (filters.status === 'active') sql += ' AND o.is_active = 1';
  if (filters.status === 'inactive') sql += ' AND o.is_active = 0';
  sql += ' GROUP BY o.id ORDER BY o.created_at DESC';

  const all = await query(sql, params);
  const total = all.length;
  const start = (page - 1) * limit;
  const items = await attachChildren(all.slice(start, start + limit));
  return { data: items, pagination: paginationMeta(total, page, limit) };
}

async function getForAdmin(id) {
  const rows = await query(`SELECT ${DETAIL_COLUMNS} FROM opportunities o WHERE o.id = ? LIMIT 1`, [id]);
  if (!rows[0]) throw notFound('Opportunity not found.');
  await attachChildren(rows);
  return rows[0];
}

async function getRawOpportunity(id) {
  const rows = await query(`SELECT ${DETAIL_COLUMNS} FROM opportunities o WHERE o.id = ? LIMIT 1`, [id]);
  return rows[0] || null;
}

function normaliseSkillNames(skills = []) {
  const seen = new Set();
  return skills.filter((skill) => {
    const key = skill.skill_id || skill.name?.toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function replaceChildren(connection, opportunityId, payload) {
  await connection.execute('DELETE FROM opportunity_branches WHERE opportunity_id = ?', [opportunityId]);
  await connection.execute('DELETE FROM opportunity_batches WHERE opportunity_id = ?', [opportunityId]);
  await connection.execute('DELETE FROM opportunity_skills WHERE opportunity_id = ?', [opportunityId]);
  await connection.execute('DELETE FROM opportunity_requirements WHERE opportunity_id = ?', [opportunityId]);

  for (const branch of payload.branches || []) {
    await connection.execute('INSERT INTO opportunity_branches (opportunity_id, branch) VALUES (?, ?)', [opportunityId, branch]);
  }
  for (const year of payload.batches || []) {
    await connection.execute('INSERT INTO opportunity_batches (opportunity_id, graduation_year) VALUES (?, ?)', [opportunityId, year]);
  }
  const skillsToSave = normaliseSkillNames(payload.skills);
  for (const skill of skillsToSave) {
    let skillId = skill.skill_id;
    if (!skillId && skill.name) {
      const [existing] = await connection.execute('SELECT id FROM skills WHERE name = ? LIMIT 1', [skill.name]);
      if (existing[0]) {
        skillId = existing[0].id;
      } else {
        const [result] = await connection.execute(
          "INSERT INTO skills (name, category) VALUES (?, 'concept')",
          [skill.name],
        );
        skillId = result.insertId;
      }
    }
    if (!skillId) continue;
    await connection.execute(
      `INSERT INTO opportunity_skills (opportunity_id, skill_id, importance, min_proficiency)
       VALUES (?, ?, ?, ?)`,
      [opportunityId, skillId, skill.importance || 'required', skill.min_proficiency || 3],
    );
  }
  for (const req of payload.requirements || []) {
    await connection.execute(
      'INSERT INTO opportunity_requirements (opportunity_id, type, value, label) VALUES (?, ?, ?, ?)',
      [opportunityId, req.type, req.value, req.label || null],
    );
  }
}

async function createOpportunity(payload, adminId) {
  return withTransaction(async (connection) => {
    const [result] = await connection.execute(
      `INSERT INTO opportunities
       (title, company, type, location, work_mode, salary_stipend, description, min_cgpa, openings,
        application_deadline, other_requirements, is_active, is_sample, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.title, payload.company, payload.type, payload.location, payload.work_mode,
        payload.salary_stipend || null, payload.description, payload.min_cgpa ?? null,
        payload.openings ?? null, payload.application_deadline, payload.other_requirements || null,
        payload.is_active === false ? 0 : 1, payload.is_sample === false ? 0 : 1, adminId,
      ],
    );
    await replaceChildren(connection, result.insertId, payload);
    return result.insertId;
  });
}

async function updateOpportunity(id, payload) {
  const existing = await getRawOpportunity(id);
  if (!existing) throw notFound('Opportunity not found.');
  return withTransaction(async (connection) => {
    await connection.execute(
      `UPDATE opportunities SET
        title = ?, company = ?, type = ?, location = ?, work_mode = ?, salary_stipend = ?, description = ?,
        min_cgpa = ?, openings = ?, application_deadline = ?, other_requirements = ?, is_active = ?, is_sample = ?
       WHERE id = ?`,
      [
        payload.title, payload.company, payload.type, payload.location, payload.work_mode,
        payload.salary_stipend || null, payload.description, payload.min_cgpa ?? null,
        payload.openings ?? null, payload.application_deadline, payload.other_requirements || null,
        payload.is_active === false ? 0 : 1, payload.is_sample === false ? 0 : 1, id,
      ],
    );
    await replaceChildren(connection, id, payload);
    return id;
  });
}

async function deleteOpportunity(id) {
  const result = await query('DELETE FROM opportunities WHERE id = ?', [id]);
  return result;
}

module.exports = {
  listForStudent,
  getForStudent,
  getEligibilitySummary,
  listForAdmin,
  getForAdmin,
  getRawOpportunity,
  createOpportunity,
  updateOpportunity,
  deleteOpportunity,
  attachChildren,
  todayString,
};
