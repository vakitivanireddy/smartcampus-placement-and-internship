const express = require('express');
const controller = require('../controllers/adminController');
const opportunityController = require('../controllers/opportunityController');
const { authenticate, requireAdmin } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { opportunityPayloadSchema } = require('../validators/opportunityValidators');
const { studentQuerySchema, studentStatusSchema, resourceSchema } = require('../validators/adminValidators');

const router = express.Router();
router.use(authenticate, requireAdmin);

router.get('/stats', controller.stats);
router.get('/students', validate(studentQuerySchema, 'query'), controller.students);
router.get('/students/:id', controller.studentDetail);
router.patch('/students/:id/status', validate(studentStatusSchema), controller.updateStudentStatus);

router.get('/opportunities', opportunityController.adminList);
router.get('/opportunities/:id', opportunityController.adminDetail);
router.post('/opportunities', validate(opportunityPayloadSchema), opportunityController.adminCreate);
router.put('/opportunities/:id', validate(opportunityPayloadSchema), opportunityController.adminUpdate);
router.delete('/opportunities/:id', opportunityController.adminDelete);

router.get('/applications/stats', controller.applicationStats);
router.get('/skill-gaps', controller.skillGapTrends);

router.get('/topics', controller.topics);
router.get('/opportunity-meta', controller.opportunityMeta);
router.get('/resources', controller.resources);
router.post('/resources', validate(resourceSchema), controller.createResource);
router.put('/resources/:id', validate(resourceSchema), controller.updateResource);
router.delete('/resources/:id', controller.deleteResource);

module.exports = router;
