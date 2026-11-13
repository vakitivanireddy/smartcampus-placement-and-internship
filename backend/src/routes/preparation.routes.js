const express = require('express');
const controller = require('../controllers/preparationController');
const { authenticate, requireStudent } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { progressSchema, noteSchema } = require('../validators/preparationValidators');

const router = express.Router();
router.use(authenticate, requireStudent);

router.get('/topics', controller.listTopics);
router.get('/topics/:slug', controller.getTopic);
router.put('/topics/:id/progress', validate(progressSchema), controller.updateTopicProgress);
router.put('/tasks/:id/progress', validate(progressSchema), controller.updateTaskProgress);
router.post('/topics/:id/notes', validate(noteSchema), controller.createNote);
router.get('/notes', controller.listAllNotes);
router.put('/notes/:id', validate(noteSchema), controller.updateNote);
router.delete('/notes/:id', controller.deleteNote);

module.exports = router;
