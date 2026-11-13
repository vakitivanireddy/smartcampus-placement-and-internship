const express = require('express');
const { authenticate, requireStudent } = require('../middleware/auth');
const { getSkillGap, getRoleNames } = require('../services/skillGapService');
const asyncHandler = require('../utils/asyncHandler');
const { badRequest } = require('../utils/httpError');

const router = express.Router();
router.use(authenticate, requireStudent);

router.get('/roles', asyncHandler(async (req, res) => {
  const roles = await getRoleNames(req.user);
  res.json({
    data: roles.map((role) => ({
      name: role,
      is_current: req.user.profile?.target_role?.toLowerCase() === role.toLowerCase(),
    })),
    meta: { caveat: 'Skill levels are self-reported for planning, not verified test results.' },
  });
}));

router.get('/', asyncHandler(async (req, res) => {
  if (req.query.opportunity_id) {
    const id = Number(req.query.opportunity_id);
    if (!Number.isInteger(id) || id <= 0) throw badRequest('Invalid opportunity ID.');
    const gap = await getSkillGap(req.user, { opportunity_id: id });
    return res.json({ data: gap });
  }
  const role = typeof req.query.role === 'string' ? req.query.role : undefined;
  const gap = await getSkillGap(req.user, { role });
  return res.json({ data: gap });
}));

module.exports = router;
