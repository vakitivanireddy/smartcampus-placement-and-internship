const express = require('express');
const controller = require('../controllers/roadmapController');
const { authenticate, requireStudent } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { generateRoadmapSchema, taskSchema, updateTaskSchema } = require('../validators/roadmapValidators');

const router = express.Router();
router.use(authenticate, requireStudent);

router.get('/', controller.getRoadmap);
router.post('/generate', validate(generateRoadmapSchema), controller.generate);
router.post('/tasks', validate(taskSchema), controller.createTask);
router.put('/tasks/:id', validate(updateTaskSchema), controller.updateTask);
router.delete('/tasks/:id', controller.deleteTask);

module.exports = router;
