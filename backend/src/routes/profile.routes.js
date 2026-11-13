const express = require('express');
const controller = require('../controllers/profileController');
const { authenticate, requireStudent } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  profileSchema, studentSkillSchema, updateStudentSkillSchema, projectSchema, certificationSchema,
} = require('../validators/profileValidators');

const router = express.Router();
router.use(authenticate, requireStudent);

router.get('/', controller.getProfile);
router.put('/', validate(profileSchema), controller.updateProfile);

router.get('/skills/catalogue', controller.listSkills);
router.post('/skills', validate(studentSkillSchema), controller.addSkill);
router.put('/skills/:id', validate(updateStudentSkillSchema), controller.updateSkill);
router.delete('/skills/:id', controller.deleteSkill);

router.get('/projects', controller.listProjects);
router.post('/projects', validate(projectSchema), controller.addProject);
router.put('/projects/:id', validate(projectSchema), controller.updateProject);
router.delete('/projects/:id', controller.deleteProject);

router.get('/certifications', controller.listCertifications);
router.post('/certifications', validate(certificationSchema), controller.addCertification);
router.put('/certifications/:id', validate(certificationSchema), controller.updateCertification);
router.delete('/certifications/:id', controller.deleteCertification);

module.exports = router;
