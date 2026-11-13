const express = require('express');
const controller = require('../controllers/notificationController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', controller.list);
router.patch('/read-all', controller.markAllRead);
router.patch('/:id/read', controller.markRead);
router.delete('/:id', controller.remove);

module.exports = router;
