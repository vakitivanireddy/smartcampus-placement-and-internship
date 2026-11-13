const jwt = require('jsonwebtoken');
const env = require('../config/env');

const COOKIE_NAME = 'sp_token';

function signToken(user) {
  return jwt.sign(
    { sub: String(user.id), role: user.role, email: user.email },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn, issuer: 'smart-placement' },
  );
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.cookieSecure,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  };
}

function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, cookieOptions());
}

function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, { ...cookieOptions(), maxAge: undefined });
}

function extractToken(req) {
  if (req.cookies && req.cookies[COOKIE_NAME]) return req.cookies[COOKIE_NAME];
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) return header.slice(7);
  return null;
}

module.exports = { COOKIE_NAME, signToken, setAuthCookie, clearAuthCookie, extractToken };
