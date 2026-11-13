const { query, withTransaction } = require('../db/pool');
const { getUserWithProfile } = require('../services/userService');
const { notFound, badRequest } = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');

function profileCompletion(user, projects, certifications, resumeCount) {
  const fields = [
    user.name, user.profile.college, user.profile.branch, user.profile.graduation_year,
    user.profile.cgpa, user.profile.target_role,
  ];
  const completedFields = fields.filter((value) => value !== null && value !== undefined && value !== '').length;
  const checks = [
    { label: 'Basic and academic details', done: completedFields >= 5 },
    { label: 'Target role selected', done: Boolean(user.profile.target_role) },
    { label: 'At least 3 skills added', done: (user.skills || []).length >= 3 },
    { label: 'At least one project', done: projects.length > 0 },
    { label: 'At least one certification', done: certifications.length > 0 },
    { label: 'Resume uploaded', done: resumeCount > 0 },
  ];
  return {
    percent: Math.round((checks.filter((check) => check.done).length / checks.length) * 100),
    checks,
  };
}

function cleanNullable(value) {
  if (value === undefined || value === '') return null;
  return value;
}

const getProfile = asyncHandler(async (req, res) => {
  const [projects, certifications, resumes] = await Promise.all([
    query('SELECT id, title, description, tech_stack, link, created_at FROM student_projects WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]),
    query('SELECT id, name, issuer, issue_date, credential_url, created_at FROM student_certifications WHERE user_id = ? ORDER BY issue_date DESC, created_at DESC', [req.user.id]),
    query('SELECT id, original_filename, status, created_at FROM resumes WHERE user_id = ? ORDER BY created_at DESC LIMIT 1', [req.user.id]),
  ]);
  const user = await getUserWithProfile(req.user.id);
  const completion = profileCompletion(user, projects, certifications, resumes.length);
  res.json({
    data: {
      user,
      projects,
      certifications,
      latest_resume: resumes[0] || null,
      completion,
    },
  });
});

const updateProfile = asyncHandler(async (req, res) => {
  const body = req.body;
  await withTransaction(async (connection) => {
    await connection.execute('UPDATE users SET name = ? WHERE id = ?', [body.name, req.user.id]);
    await connection.execute(
      `UPDATE student_profiles SET
        college = ?, branch = ?, graduation_year = ?, cgpa = ?, active_backlogs = ?,
        tenth_percentage = ?, twelfth_percentage = ?, target_role = ?, phone = ?, bio = ?,
        linkedin_url = ?, github_url = ?
       WHERE user_id = ?`,
      [
        cleanNullable(body.college), cleanNullable(body.branch), cleanNullable(body.graduation_year),
        cleanNullable(body.cgpa), cleanNullable(body.active_backlogs), cleanNullable(body.tenth_percentage),
        cleanNullable(body.twelfth_percentage), cleanNullable(body.target_role), cleanNullable(body.phone),
        cleanNullable(body.bio), cleanNullable(body.linkedin_url), cleanNullable(body.github_url), req.user.id,
      ],
    );
    if (Array.isArray(body.preferred_roles)) {
      await connection.execute('DELETE FROM student_preferred_roles WHERE user_id = ?', [req.user.id]);
      for (const role of body.preferred_roles) {
        await connection.execute(
          'INSERT IGNORE INTO student_preferred_roles (user_id, role_name) VALUES (?, ?)',
          [req.user.id, role],
        );
      }
    }
  });

  const user = await getUserWithProfile(req.user.id);
  res.json({ data: { user }, message: 'Profile updated successfully.' });
});

const listSkills = asyncHandler(async (req, res) => {
  const search = String(req.query.search || '').trim();
  const params = [];
  let sql = 'SELECT id, name, category, description, resource_url FROM skills';
  if (search) {
    sql += ' WHERE name LIKE ?';
    params.push(`%${search}%`);
  }
  sql += ' ORDER BY name LIMIT 100';
  const rows = await query(sql, params);
  res.json({ data: rows });
});

const addSkill = asyncHandler(async (req, res) => {
  const { skill_id, name, proficiency, source } = req.body;
  let skillId = skill_id;
  if (!skillId) {
    const existing = await query('SELECT id FROM skills WHERE LOWER(name) = LOWER(?) LIMIT 1', [name]);
    if (existing[0]) {
      skillId = existing[0].id;
    } else {
      const result = await query('INSERT INTO skills (name, category) VALUES (?, ?)', [name, 'concept']);
      // `query` returns the ResultSetHeader for inserts.
      skillId = result.insertId;
    }
  }
  const skillRows = await query('SELECT id, name, category, resource_url FROM skills WHERE id = ?', [skillId]);
  if (!skillRows[0]) throw notFound('Skill not found.');
  await query(
    `INSERT INTO student_skills (user_id, skill_id, proficiency, source, is_confirmed)
     VALUES (?, ?, ?, ?, 1)
     ON DUPLICATE KEY UPDATE proficiency = VALUES(proficiency), source = VALUES(source), is_confirmed = 1`,
    [req.user.id, skillId, proficiency, source || 'manual'],
  );
  const rows = await query(
    `SELECT ss.id, ss.skill_id, ss.proficiency, ss.source, ss.is_confirmed, s.name, s.category, s.resource_url
     FROM student_skills ss JOIN skills s ON s.id = ss.skill_id
     WHERE ss.user_id = ? AND ss.skill_id = ?`,
    [req.user.id, skillId],
  );
  res.status(201).json({ data: rows[0], message: 'Skill added.' });
});

const updateSkill = asyncHandler(async (req, res) => {
  const rows = await query('SELECT id FROM student_skills WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!rows[0]) throw notFound('Skill not found on your profile.');
  const fields = [];
  const params = [];
  if (req.body.proficiency !== undefined) {
    fields.push('proficiency = ?');
    params.push(req.body.proficiency);
  }
  if (req.body.is_confirmed !== undefined) {
    fields.push('is_confirmed = ?');
    params.push(req.body.is_confirmed ? 1 : 0);
  }
  if (fields.length === 0) throw badRequest('Nothing to update.');
  params.push(req.params.id, req.user.id);
  await query(`UPDATE student_skills SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`, params);
  res.json({ message: 'Skill updated.' });
});

const deleteSkill = asyncHandler(async (req, res) => {
  await query('DELETE FROM student_skills WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  res.json({ message: 'Skill removed.' });
});

const listProjects = asyncHandler(async (req, res) => {
  const rows = await query('SELECT * FROM student_projects WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
  res.json({ data: rows });
});

const addProject = asyncHandler(async (req, res) => {
  const { title, description, tech_stack, link } = req.body;
  const result = await query(
    'INSERT INTO student_projects (user_id, title, description, tech_stack, link) VALUES (?, ?, ?, ?, ?)',
    [req.user.id, title, description || null, tech_stack || null, link || null],
  );
  const rows = await query('SELECT * FROM student_projects WHERE id = ?', [result.insertId]);
  res.status(201).json({ data: rows[0], message: 'Project added.' });
});

const updateProject = asyncHandler(async (req, res) => {
  const { title, description, tech_stack, link } = req.body;
  await query(
    `UPDATE student_projects SET title = ?, description = ?, tech_stack = ?, link = ? WHERE id = ? AND user_id = ?`,
    [title, description || null, tech_stack || null, link || null, req.params.id, req.user.id],
  );
  const rows = await query('SELECT * FROM student_projects WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!rows[0]) throw notFound('Project not found.');
  res.json({ data: rows[0], message: 'Project updated.' });
});

const deleteProject = asyncHandler(async (req, res) => {
  await query('DELETE FROM student_projects WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  res.json({ message: 'Project deleted.' });
});

const listCertifications = asyncHandler(async (req, res) => {
  const rows = await query('SELECT * FROM student_certifications WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
  res.json({ data: rows });
});

const addCertification = asyncHandler(async (req, res) => {
  const { name, issuer, issue_date, credential_url } = req.body;
  const result = await query(
    'INSERT INTO student_certifications (user_id, name, issuer, issue_date, credential_url) VALUES (?, ?, ?, ?, ?)',
    [req.user.id, name, issuer || null, issue_date || null, credential_url || null],
  );
  const rows = await query('SELECT * FROM student_certifications WHERE id = ?', [result.insertId]);
  res.status(201).json({ data: rows[0], message: 'Certification added.' });
});

const updateCertification = asyncHandler(async (req, res) => {
  const { name, issuer, issue_date, credential_url } = req.body;
  await query(
    `UPDATE student_certifications SET name = ?, issuer = ?, issue_date = ?, credential_url = ? WHERE id = ? AND user_id = ?`,
    [name, issuer || null, issue_date || null, credential_url || null, req.params.id, req.user.id],
  );
  const rows = await query('SELECT * FROM student_certifications WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!rows[0]) throw notFound('Certification not found.');
  res.json({ data: rows[0], message: 'Certification updated.' });
});

const deleteCertification = asyncHandler(async (req, res) => {
  await query('DELETE FROM student_certifications WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  res.json({ message: 'Certification deleted.' });
});

module.exports = {
  getProfile,
  updateProfile,
  listSkills,
  addSkill,
  updateSkill,
  deleteSkill,
  listProjects,
  addProject,
  updateProject,
  deleteProject,
  listCertifications,
  addCertification,
  updateCertification,
  deleteCertification,
};
