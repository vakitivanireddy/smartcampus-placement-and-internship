const { z } = require('zod');

const importSkillsSchema = z.object({
  skills: z.array(z.object({
    skill_id: z.coerce.number().int().positive().optional(),
    name: z.string().trim().min(1).max(100).optional(),
    proficiency: z.coerce.number().int().min(1).max(5).default(3),
  })).min(1, 'Select at least one skill to import.').max(50),
}).refine((data) => data.skills.every((skill) => skill.skill_id || skill.name), {
  message: 'Each imported skill needs an ID or a name.',
});

module.exports = { importSkillsSchema };
