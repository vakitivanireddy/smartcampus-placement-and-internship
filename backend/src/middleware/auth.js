const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { extractToken } = require('../utils/token');
const { getUserWithProfile } = require('../services/userService');
const { AppError } = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');

const authenticate = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);
  if (!token) {
    throw new AppError(401, 'Please sign in to continue.');
  }

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret, { issuer: 'smart-placement' });
  } catch {
    throw new AppError(401, 'Your session has expired. Please sign in again.');
  }

  const user = await getUserWithProfile(payload.sub);
  if (!user) {
    throw new AppError(401, 'This account no longer exists.');
  }
  if (!user.is_active) {
    throw new AppError(403, 'This account has been deactivated. Contact your placement cell.');
  }

  req.user = user;
  next();
});

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return next(new AppError(403, 'Administrator access is required for this action.'));
    }
    return next();
  };
}

const requireAdmin = requireRole('admin');
const requireStudent = requireRole('student');

module.exports = { authenticate, requireRole, requireAdmin, requireStudent };
