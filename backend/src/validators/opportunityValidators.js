const { z } = require('zod');

const boolFromQuery = z.preprocess((value) => {
  if (value === true || value === 'true' || value === '1') return true;
  if (value === false || value === 'false' || value === '0' || value === undefined || value === '') return false;
  return value;
}, z.boolean());

const opportunityQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(8),
  search: z.string().trim().max(120).optional(),
  type: z.enum(['internship', 'placement', 'job']).optional().or(z.literal('')),
  work_mode: z.enum(['onsite', 'remote', 'hybrid']).optional().or(z.literal('')),
  location: z.string().trim().max(100).optional(),
  eligibility: z.enum(['eligible', 'not_eligible', 'needs_info']).optional().or(z.literal('')),
  sort: z.enum(['deadline_asc', 'deadline_desc', 'newest', 'company_asc', 'cgpa_desc', 'eligibility']).optional().default('deadline_asc'),
  include_expired: boolFromQuery.optional().default(false),
  bookmarked: boolFromQuery.optional().default(false),
});

const skillRequirementSchema = z.object({
  skill_id: z.coerce.number().int().positive().optional(),
  name: z.string().trim().min(1).max(100).optional(),
  importance: z.enum(['required', 'preferred']).default('required'),
  min_proficiency: z.coerce.number().int().min(1).max(5).default(3),
}).refine((data) => data.skill_id || data.name, { message: 'Choose a skill for every skill row.' });

const extraRequirementSchema = z.object({
  type: z.enum(['max_backlogs', 'min_tenth_percentage', 'min_twelfth_percentage']),
  value: z.coerce.number().min(0).max(100),
  label: z.string().trim().max(180).optional().or(z.literal('')),
});

const opportunityPayloadSchema = z.object({
  title: z.string().trim().min(3, 'Enter the role title.').max(180),
  company: z.string().trim().min(2, 'Enter the company name.').max(180),
  type: z.enum(['internship', 'placement', 'job']),
  location: z.string().trim().min(2, 'Enter a location.').max(150),
  work_mode: z.enum(['onsite', 'remote', 'hybrid']),
  salary_stipend: z.string().trim().max(120).optional().or(z.literal('')),
  description: z.string().trim().min(30, 'Add a meaningful description (at least 30 characters).').max(8000),
  min_cgpa: z.union([z.coerce.number().min(0).max(10), z.null()]).optional(),
  openings: z.union([z.coerce.number().int().min(1).max(100000), z.null()]).optional(),
  application_deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid deadline date.'),
  other_requirements: z.string().trim().max(2000).optional().or(z.literal('')),
  branches: z.array(z.string().trim().min(1).max(80)).max(30).optional().default([]),
  batches: z.array(z.coerce.number().int().min(2000).max(2100)).max(15).optional().default([]),
  skills: z.array(skillRequirementSchema).max(30).optional().default([]),
  requirements: z.array(extraRequirementSchema).max(6).optional().default([]),
  is_active: z.boolean().optional().default(true),
  is_sample: z.boolean().optional().default(true),
});

module.exports = { opportunityQuerySchema, opportunityPayloadSchema };
