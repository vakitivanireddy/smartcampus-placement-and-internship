const bcrypt = require('bcryptjs');
const { query, withTransaction } = require('../db/pool');
const { signToken, setAuthCookie, clearAuthCookie } = require('../utils/token');
const { getUserWithProfile } = require('../services/userService');
const { AppError, conflict } = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');

const register = asyncHandler(async (req, res) => {
  const { name, email, password, college, branch, graduationYear, cgpa, targetRole } = req.body;

  const existing = await query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
  if (existing.length > 0) {
    throw conflict('An account with this email already exists. Try signing in instead.');
  }

  const roleRows = await query("SELECT id FROM roles WHERE name = 'student' LIMIT 1");
  if (!roleRows[0]) throw new AppError(500, 'Student role is not configured.');

  const passwordHash = await bcrypt.hash(password, 12);

  const userId = await withTransaction(async (connection) => {
    const [result] = await connection.execute(
      'INSERT INTO users (name, email, password_hash, role_id) VALUES (?, ?, ?, ?)',
      [name, email, passwordHash, roleRows[0].id],
    );
    await connection.execute(
      `INSERT INTO student_profiles (user_id, college, branch, graduation_year, cgpa, target_role)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userIdValue(result), college || null, branch || null, graduationYear || null, cgpa ?? null, targetRole || null],
    );
    await connection.execute(
      `INSERT INTO notifications (user_id, type, title, message, link, dedupe_key)
       VALUES (?, 'system', 'Welcome to Smart Placement', 'Complete your profile and upload a resume to get accurate eligibility and skill-gap results.', '/profile', 'welcome')`,
      [userIdValue(result)],
    );
    return userIdValue(result);
  });

  const user = await getUserWithProfile(userId);
  const token = signToken(user);
  setAuthCookie(res, token);
  res.status(201).json({ data: { user }, message: 'Account created. Welcome!' });
});

function userIdValue(result) {
  return result.insertId;
}

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const rows = await query(
    `SELECT u.id, u.password_hash, u.is_active, r.name AS role
     FROM users u JOIN roles r ON r.id = u.role_id
     WHERE u.email = ? LIMIT 1`,
    [email],
  );
  const account = rows[0];
  if (!account) {
    throw new AppError(401, 'Invalid email or password.');
  }
  const matches = await bcrypt.compare(password, account.password_hash);
  if (!matches) {
    throw new AppError(401, 'Invalid email or password.');
  }
  if (!account.is_active) {
    throw new AppError(403, 'This account has been deactivated. Contact your placement cell.');
  }
  const user = await getUserWithProfile(account.id);
  setAuthCookie(res, signToken(user));
  res.json({ data: { user }, message: `Welcome back, ${user.name.split(' ')[0]}!` });
});

const logout = asyncHandler(async (req, res) => {
  clearAuthCookie(res);
  res.json({ message: 'Signed out.' });
});

const me = asyncHandler(async (req, res) => {
  res.json({ data: { user: req.user } });
});

module.exports = { register, login, logout, me };
