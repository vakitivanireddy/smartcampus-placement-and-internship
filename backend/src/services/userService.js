const { query } = require('../db/pool');

async function findUserById(userId) {
  const rows = await query(
    `SELECT u.id, u.name, u.email, u.is_active, u.created_at, r.name AS role,
            p.college, p.branch, p.graduation_year, p.cgpa, p.active_backlogs,
            p.tenth_percentage, p.twelfth_percentage, p.target_role, p.phone,
            p.bio, p.linkedin_url, p.github_url
     FROM users u
     JOIN roles r ON r.id = u.role_id
     LEFT JOIN student_profiles p ON p.user_id = u.id
     WHERE u.id = ?
     LIMIT 1`,
    [userId],
  );
  return rows[0] || null;
}

function serializeUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    is_active: Boolean(row.is_active),
    created_at: row.created_at,
    profile: {
      college: row.college,
      branch: row.branch,
      graduation_year: row.graduation_year,
      cgpa: row.cgpa,
      active_backlogs: row.active_backlogs,
      tenth_percentage: row.tenth_percentage,
      twelfth_percentage: row.twelfth_percentage,
      target_role: row.target_role,
      phone: row.phone,
      bio: row.bio,
      linkedin_url: row.linkedin_url,
      github_url: row.github_url,
    },
  };
}

async function getUserWithProfile(userId) {
  const row = await findUserById(userId);
  if (!row) return null;
  const user = serializeUser(row);
  if (user.role === 'student') {
    const [preferred, studentSkills] = await Promise.all([
      query('SELECT role_name FROM student_preferred_roles WHERE user_id = ? ORDER BY id', [userId]),
      query(
        `SELECT ss.id, ss.skill_id, ss.proficiency, ss.source, ss.is_confirmed, ss.created_at,
                s.name, s.category, s.resource_url, s.description
         FROM student_skills ss
         JOIN skills s ON s.id = ss.skill_id
         WHERE ss.user_id = ? AND ss.is_confirmed = 1
         ORDER BY s.name`,
        [userId],
      ),
    ]);
    user.preferred_roles = preferred.map((item) => item.role_name);
    user.skills = studentSkills;
  } else {
    user.preferred_roles = [];
    user.skills = [];
  }
  return user;
}

module.exports = { findUserById, getUserWithProfile, serializeUser };
