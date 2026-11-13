const asyncHandler = require('../utils/asyncHandler');
const { getDashboard } = require('../services/dashboardService');

const dashboard = asyncHandler(async (req, res) => {
  res.json({ data: await getDashboard(req.user) });
});

module.exports = { dashboard };
