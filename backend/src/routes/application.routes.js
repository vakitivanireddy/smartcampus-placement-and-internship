const express = require('express');
const controller = require('../controllers/applicationController');
const { authenticate, requireStudent } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createApplicationSchema, updateApplicationSchema } = require('../validators/applicationValidators');

const router = express.Router();
router.use(authenticate, requireStudent);

router.get('/upcoming', controller.upcoming);
router.get('/', controller.list);
router.post('/', validate(createApplicationSchema), controller.create);
router.put('/:id', validate(updateApplicationSchema), controller.update);
router.delete('/:id', controller.remove);

module.exports = router;
