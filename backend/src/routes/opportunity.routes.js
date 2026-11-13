const express = require('express');
const controller = require('../controllers/opportunityController');
const { authenticate, requireStudent } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { opportunityQuerySchema } = require('../validators/opportunityValidators');

const router = express.Router();
router.use(authenticate, requireStudent);

router.get('/meta/filters', controller.meta);
router.get('/', validate(opportunityQuerySchema, 'query'), controller.list);
router.get('/bookmarks', controller.bookmarks);
router.get('/:id/eligibility', controller.eligibility);
router.post('/:id/bookmark', controller.toggleBookmark);
router.get('/:id', controller.detail);

module.exports = router;
