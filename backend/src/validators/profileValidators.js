const { z } = require('zod');

const optionalUrl = z.union([z.string().trim().url('Enter a valid URL (including https://).').max(500), z.literal('')]).optional();

const profileSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name.').max(120),
  college: z.string().trim().max(180).optional(),
  branch: z.string().trim().max(80).optional(),
  graduation_year: z.coerce.number().int().min(2000).max(2100).nullable().optional(),
  cgpa: z.coerce.number().min(0).max(10).nullable().optional(),
  active_backlogs: z.coerce.number().int().min(0).max(50).nullable().optional(),
  tenth_percentage: z.coerce.number().min(0).max(100).nullable().optional(),
  twelfth_percentage: z.coerce.number().min(0).max(100).nullable().optional(),
  target_role: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(30).optional(),
  bio: z.string().trim().max(600).optional(),
  linkedin_url: optionalUrl,
  github_url: optionalUrl,
  preferred_roles: z.array(z.string().trim().min(1).max(120)).max(5).optional(),
});

const studentSkillSchema = z.object({
  skill_id: z.coerce.number().int().positive().optional(),
  name: z.string().trim().min(1).max(100).optional(),
  proficiency: z.coerce.number().int().min(1).max(5).default(3),
  source: z.enum(['manual', 'resume']).default('manual'),
  is_confirmed: z.boolean().optional().default(true),
}).refine((data) => data.skill_id || data.name, {
  message: 'Choose a skill or enter a skill name.',
  path: ['name'],
});

const updateStudentSkillSchema = z.object({
  proficiency: z.coerce.number().int().min(1).max(5).optional(),
  is_confirmed: z.boolean().optional(),
});

const projectSchema = z.object({
  title: z.string().trim().min(2, 'Enter a project title.').max(180),
  description: z.string().trim().max(2000).optional(),
  tech_stack: z.string().trim().max(500).optional(),
  link: optionalUrl,
});

const certificationSchema = z.object({
  name: z.string().trim().min(2, 'Enter the certification name.').max(180),
  issuer: z.string().trim().max(180).optional(),
  issue_date: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.'), z.literal('')]).nullable().optional(),
  credential_url: optionalUrl,
});

module.exports = { profileSchema, studentSkillSchema, updateStudentSkillSchema, projectSchema, certificationSchema };
