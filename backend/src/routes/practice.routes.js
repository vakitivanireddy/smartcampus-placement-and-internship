const express = require('express');
const controller = require('../controllers/practiceController');
const { authenticate, requireStudent } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { submitAttemptSchema, submitMockTestSchema } = require('../validators/practiceValidators');

const router = express.Router();
router.use(authenticate, requireStudent);

router.get('/overview', controller.getOverview);
router.get('/aptitude/questions', controller.listAptitudeQuestions);
router.post('/aptitude/attempts', validate(submitAttemptSchema), controller.submitAptitude);
router.get('/mock-tests', controller.listMockTests);
router.get('/mock-tests/:slug', controller.getMockTest);
router.post('/mock-tests/:slug/attempts', validate(submitMockTestSchema), controller.submitMockTest);
router.get('/attempts', controller.listAttempts);
router.get('/attempts/:id', controller.getAttempt);

module.exports = router;
