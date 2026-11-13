const { query } = require('../db/pool');
const { APPLICATION_STATUSES } = require('./applicationService');

async function getStats() {
  const [students, opportunities, applications, progress, deadlines, recentApps, topSkills, statusRows] = await Promise.all([
    query("SELECT COUNT(*) AS total, SUM(u.is_active = 1) AS active FROM users u JOIN roles r ON r.id = u.role_id WHERE r.name = 'student'"),
    query("SELECT COUNT(*) AS total, SUM(is_active = 1) AS active, SUM(is_active = 1 AND application_deadline >= CURDATE()) AS open FROM opportunities"),
    query('SELECT COUNT(*) AS total FROM applications'),
    query(
      `SELECT (SELECT COUNT(*) FROM preparation_topics WHERE is_active = 1) AS topics_total,
              (SELECT COUNT(*) FROM student_progress sp JOIN users u ON u.id = sp.user_id
               JOIN roles r ON r.id = u.role_id WHERE r.name = 'student' AND u.is_active = 1 AND sp.is_completed = 1) AS topics_completed`,
    ),
    query(
      `SELECT o.id, o.title, o.company, DATE_FORMAT(o.application_deadline, '%Y-%m-%d') AS application_deadline,
              (SELECT COUNT(*) FROM applications a WHERE a.opportunity_id = o.id) AS applications_count
       FROM opportunities o WHERE o.is_active = 1 AND o.application_deadline >= CURDATE()
       ORDER BY o.application_deadline ASC LIMIT 5`,
    ),
    query(
      `SELECT a.id, a.status, a.created_at, u.name AS student_name, u.email AS student_email,
              o.title, o.company
       FROM applications a JOIN users u ON u.id = a.user_id JOIN opportunities o ON o.id = a.opportunity_id
       ORDER BY a.updated_at DESC LIMIT 8`,
    ),
    query(
      `SELECT s.name, COUNT(*) AS student_count FROM student_skills ss
       JOIN skills s ON s.id = ss.skill_id WHERE ss.is_confirmed = 1
       GROUP BY s.id, s.name ORDER BY student_count DESC LIMIT 8`,
    ),
    query('SELECT status, COUNT(*) AS count FROM applications GROUP BY status'),
  ]);

  const topicsTotal = Number(progress[0].topics_total);
  const topicsCompleted = Number(progress[0].topics_completed);
  const activeStudents = Number(students[0].active || 0);
  const byStatus = Object.fromEntries(APPLICATION_STATUSES.map((status) => [status, 0]));
  for (const row of statusRows) byStatus[row.status] = Number(row.count);

  return {
    students: { total: Number(students[0].total), active: activeStudents },
    opportunities: {
      total: Number(opportunities[0].total),
      active: Number(opportunities[0].active || 0),
      open: Number(opportunities[0].open || 0),
    },
    applications: { total: Number(applications[0].total), by_status: byStatus },
    preparation: {
      topics_total: topicsTotal,
      avg_completion_percent: activeStudents && topicsTotal
        ? Math.round((topicsCompleted / (activeStudents * topicsTotal)) * 100)
        : 0,
    },
    upcoming_deadlines: deadlines,
    recent_applications: recentApps,
    top_skills: topSkills.map((row) => ({ name: row.name, student_count: Number(row.student_count) })),
    meta: { sample_notice: 'Seeded opportunities are sample data, not verified live openings.' },
  };
}

async function listStudents({ search = '', page = 1, limit = 10, status = '' }) {
  let sql = `SELECT u.id, u.name, u.email, u.is_active, u.created_at,
                    p.college, p.branch, p.graduation_year, p.cgpa, p.target_role,
                    (SELECT COUNT(*) FROM student_skills ss WHERE ss.user_id = u.id AND ss.is_confirmed = 1) AS skills_count,
                    (SELECT COUNT(*) FROM applications a WHERE a.user_id = u.id) AS applications_count,
                    (SELECT COUNT(*) FROM bookmarks b WHERE b.user_id = u.id) AS bookmarks_count,
                    (SELECT COUNT(*) FROM resumes r WHERE r.user_id = u.id) AS resumes_count,
                    (SELECT COUNT(*) FROM student_progress sp WHERE sp.user_id = u.id AND sp.is_completed = 1) AS topics_completed
             FROM users u JOIN roles r ON r.id = u.role_id
             LEFT JOIN student_profiles p ON p.user_id = u.id
             WHERE r.name = 'student'`;
  const params = [];
  if (search) {
    sql += ' AND (u.name LIKE ? OR u.email LIKE ? OR p.college LIKE ? OR p.branch LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (status === 'active') sql += ' AND u.is_active = 1';
  if (status === 'inactive') sql += ' AND u.is_active = 0';
  sql += ' ORDER BY u.created_at DESC';

  const rows = await query(sql, params);
  const topicsTotalRow = await query('SELECT COUNT(*) AS count FROM preparation_topics WHERE is_active = 1');
  const topicsTotal = Number(topicsTotalRow[0].count);
  const decorated = rows.map((row) => ({
    ...row,
    is_active: Boolean(row.is_active),
    skills_count: Number(row.skills_count),
    applications_count: Number(row.applications_count),
    bookmarks_count: Number(row.bookmarks_count),
    resumes_count: Number(row.resumes_count),
    topics_completed: Number(row.topics_completed),
    preparation_percent: topicsTotal ? Math.round((Number(row.topics_completed) / topicsTotal) * 100) : 0,
  }));
  const total = decorated.length;
  const start = (page - 1) * limit;
  return {
    data: decorated.slice(start, start + limit),
    pagination: { total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) },
  };
}

async function getStudentDetail(id) {
  const rows = await query(
    `SELECT u.id, u.name, u.email, u.is_active, u.created_at, p.*
     FROM users u JOIN roles r ON r.id = u.role_id
     LEFT JOIN student_profiles p ON p.user_id = u.id
     WHERE u.id = ? AND r.name = 'student'`,
    [id],
  );
  if (!rows[0]) return null;
  const [skills, projects, certifications, applications, progress, notes] = await Promise.all([
    query(
      `SELECT ss.id, ss.proficiency, ss.source, ss.is_confirmed, s.name, s.category
       FROM student_skills ss JOIN skills s ON s.id = ss.skill_id
       WHERE ss.user_id = ? ORDER BY s.category, s.name`,
      [id],
    ),
    query('SELECT id, title, description, tech_stack, link FROM student_projects WHERE user_id = ?', [id]),
    query('SELECT id, name, issuer, issue_date FROM student_certifications WHERE user_id = ?', [id]),
    query(
      `SELECT a.id, a.status, a.applied_date, a.assessment_date, a.interview_date, a.updated_at,
              o.title, o.company
       FROM applications a JOIN opportunities o ON o.id = a.opportunity_id
       WHERE a.user_id = ? ORDER BY a.updated_at DESC`,
      [id],
    ),
    query(
      `SELECT t.title, t.category, COALESCE(sp.is_completed, 0) AS is_completed, sp.completed_at
       FROM preparation_topics t LEFT JOIN student_progress sp ON sp.topic_id = t.id AND sp.user_id = ?
       WHERE t.is_active = 1 ORDER BY t.sort_order`,
      [id],
    ),
    query('SELECT id, title, body, updated_at FROM personal_notes WHERE user_id = ? ORDER BY updated_at DESC LIMIT 10', [id]),
  ]);
  return {
    ...rows[0],
    is_active: Boolean(rows[0].is_active),
    skills,
    projects,
    certifications,
    applications,
    preparation: progress.map((row) => ({ ...row, is_completed: Boolean(row.is_completed) })),
    notes,
  };
}

async function setStudentActive(id, isActive) {
  const rows = await query("SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = ? AND r.name = 'student'", [id]);
  if (!rows[0]) return false;
  await query('UPDATE users SET is_active = ? WHERE id = ?', [isActive ? 1 : 0, id]);
  return true;
}

async function getApplicationStats() {
  const [statusRows, totalRows, byOpportunity, weekly] = await Promise.all([
    query('SELECT status, COUNT(*) AS count FROM applications GROUP BY status'),
    query('SELECT COUNT(*) AS total FROM applications'),
    query(
      `SELECT o.id, o.title, o.company, o.type, DATE_FORMAT(o.application_deadline, '%Y-%m-%d') AS application_deadline,
              COUNT(a.id) AS total,
              SUM(a.status = 'interested') AS interested,
              SUM(a.status = 'applied') AS applied,
              SUM(a.status = 'assessment') AS assessment,
              SUM(a.status = 'interview') AS interview,
              SUM(a.status = 'selected') AS selected,
              SUM(a.status = 'rejected') AS rejected
       FROM opportunities o LEFT JOIN applications a ON a.opportunity_id = o.id
       GROUP BY o.id ORDER BY total DESC, o.application_deadline ASC`,
    ),
    query(
      `SELECT DATE_FORMAT(created_at, '%x-W%v') AS week_key, MIN(DATE(created_at)) AS week_start, COUNT(*) AS count
       FROM applications
       WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 56 DAY)
       GROUP BY week_key ORDER BY week_start`,
    ),
  ]);
  const byStatus = Object.fromEntries(APPLICATION_STATUSES.map((status) => [status, 0]));
  for (const row of statusRows) byStatus[row.status] = Number(row.count);
  return {
    total: Number(totalRows[0].total),
    by_status: byStatus,
    by_opportunity: byOpportunity.map((row) => ({
      ...row,
      total: Number(row.total),
      interested: Number(row.interested || 0),
      applied: Number(row.applied || 0),
      assessment: Number(row.assessment || 0),
      interview: Number(row.interview || 0),
      selected: Number(row.selected || 0),
      rejected: Number(row.rejected || 0),
    })),
    weekly: weekly.map((row) => ({ week: row.week_key, week_start: row.week_start, count: Number(row.count) })),
  };
}

async function getSkillGapTrends(roleFilter = '') {
  let sql = `SELECT p.target_role AS role_name, s.name AS skill_name, rs.importance, rs.required_proficiency,
                    COUNT(DISTINCT u.id) AS students_with_role,
                    SUM(CASE WHEN ss.proficiency IS NULL OR ss.proficiency < rs.required_proficiency THEN 1 ELSE 0 END) AS students_missing
             FROM users u
             JOIN roles r ON r.id = u.role_id AND r.name = 'student'
             JOIN student_profiles p ON p.user_id = u.id AND p.target_role IS NOT NULL
             JOIN role_skills rs ON LOWER(rs.role_name) = LOWER(p.target_role)
             JOIN skills s ON s.id = rs.skill_id
             LEFT JOIN student_skills ss ON ss.user_id = u.id AND ss.skill_id = rs.skill_id AND ss.is_confirmed = 1
             WHERE u.is_active = 1`;
  const params = [];
  if (roleFilter) {
    sql += ' AND LOWER(p.target_role) = LOWER(?)';
    params.push(roleFilter);
  }
  sql += ` GROUP BY p.target_role, s.id, s.name, rs.importance, rs.required_proficiency
           ORDER BY students_missing DESC, students_with_role DESC, s.name LIMIT 40`;
  const rows = await query(sql, params);
  const roleRows = await query(
    `SELECT p.target_role AS role_name, COUNT(*) AS students
     FROM users u JOIN roles r ON r.id = u.role_id AND r.name = 'student'
     JOIN student_profiles p ON p.user_id = u.id
     WHERE u.is_active = 1 AND p.target_role IS NOT NULL GROUP BY p.target_role ORDER BY students DESC`,
  );
  return {
    roles: roleRows.map((row) => ({ role_name: row.role_name, students: Number(row.students) })),
    trends: rows.map((row) => ({
      role_name: row.role_name,
      skill_name: row.skill_name,
      importance: row.importance,
      required_proficiency: row.required_proficiency,
      students_with_role: Number(row.students_with_role),
      students_missing: Number(row.students_missing),
      gap_percent: Number(row.students_with_role)
        ? Math.round((Number(row.students_missing) / Number(row.students_with_role)) * 100)
        : 0,
    })),
    meta: {
      basis: 'Compares each student\'s confirmed, self-rated skills with the configured requirements for their target role. It is an aggregate preparation trend, not an assessment result.',
    },
  };
}

async function listResources() {
  return query(
    `SELECT lr.id, lr.title, lr.url, lr.provider, lr.resource_type, lr.is_free, lr.topic_id,
            lr.created_at, t.title AS topic_title
     FROM learning_resources lr LEFT JOIN preparation_topics t ON t.id = lr.topic_id
     ORDER BY lr.created_at DESC`,
  );
}

async function listTopicsSimple() {
  return query('SELECT id, slug, title, category FROM preparation_topics WHERE is_active = 1 ORDER BY sort_order');
}

async function getOpportunityMeta() {
  const [skills, branches, batches] = await Promise.all([
    query('SELECT id, name, category FROM skills ORDER BY name'),
    query('SELECT DISTINCT branch FROM opportunity_branches ORDER BY branch'),
    query('SELECT DISTINCT graduation_year FROM opportunity_batches ORDER BY graduation_year'),
  ]);
  return {
    skills: skills.map((row) => ({ id: row.id, name: row.name, category: row.category })),
    branches: branches.map((row) => row.branch),
    batches: batches.map((row) => Number(row.graduation_year)),
  };
}

module.exports = {
  getStats, listStudents, getStudentDetail, setStudentActive,
  getApplicationStats, getSkillGapTrends, listResources, listTopicsSimple,
  getOpportunityMeta,
};
