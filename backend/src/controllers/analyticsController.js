const asyncHandler = require('../utils/asyncHandler');
const { getAnalytics } = require('../services/analyticsService');

const analytics = asyncHandler(async (req, res) => {
  res.json({ data: await getAnalytics(req.user) });
});

module.exports = { analytics };
