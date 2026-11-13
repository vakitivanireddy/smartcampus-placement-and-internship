const express = require('express');
const rateLimit = require('express-rate-limit');
const controller = require('../controllers/resumeController');
const { authenticate, requireStudent } = require('../middleware/auth');
const { handleUpload } = require('../middleware/upload');
const validate = require('../middleware/validate');
const { importSkillsSchema } = require('../validators/resumeValidators');

const router = express.Router();
router.use(authenticate, requireStudent);

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many resume uploads. Please wait before trying again.' } },
});

router.post('/upload', uploadLimiter, handleUpload, controller.upload);
router.get('/', controller.list);
router.get('/:id', controller.getOne);
router.post('/:id/import-skills', validate(importSkillsSchema), controller.importSkills);
router.delete('/:id', controller.remove);

module.exports = router;
