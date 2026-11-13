const express = require('express');
const authRoutes = require('./auth.routes');
const profileRoutes = require('./profile.routes');
const opportunityRoutes = require('./opportunity.routes');
const resumeRoutes = require('./resume.routes');
const skillGapRoutes = require('./skillGap.routes');
const preparationRoutes = require('./preparation.routes');
const practiceRoutes = require('./practice.routes');
const roadmapRoutes = require('./roadmap.routes');
const applicationRoutes = require('./application.routes');
const notificationRoutes = require('./notification.routes');
const adminRoutes = require('./admin.routes');
const { dashboard } = require('../controllers/dashboardController');
const { analytics } = require('../controllers/analyticsController');
const { authenticate, requireStudent } = require('../middleware/auth');
const { query } = require('../db/pool');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.get('/health', asyncHandler(async (req, res) => {
  await query('SELECT 1 AS ok');
  res.json({ status: 'ok', database: 'connected', time: new Date().toISOString() });
}));

router.use('/auth', authRoutes);
router.use('/profile', profileRoutes);
router.use('/opportunities', opportunityRoutes);
router.use('/resume', resumeRoutes);
router.use('/skill-gap', skillGapRoutes);
router.use('/preparation', preparationRoutes);
router.use('/practice', practiceRoutes);
router.use('/roadmap', roadmapRoutes);
router.use('/applications', applicationRoutes);
router.use('/notifications', notificationRoutes);
router.use('/admin', adminRoutes);

router.get('/dashboard', authenticate, requireStudent, dashboard);
router.get('/analytics', authenticate, requireStudent, analytics);

module.exports = router;
