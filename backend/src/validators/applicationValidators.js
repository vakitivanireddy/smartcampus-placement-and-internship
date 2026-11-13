const { z } = require('zod');

const STATUSES = ['interested', 'applied', 'assessment', 'interview', 'selected', 'rejected'];

const dateOnly = z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid date.'), z.literal(''), z.null()]).optional();
const dateTime = z.union([z.string().min(10, 'Use a valid date and time.').max(30), z.literal(''), z.null()]).optional();

const createApplicationSchema = z.object({
  opportunity_id: z.coerce.number().int().positive(),
  status: z.enum(STATUSES).default('interested'),
  applied_date: dateOnly,
  assessment_date: dateTime,
  interview_date: dateTime,
  notes: z.string().trim().max(2000).optional(),
});

const updateApplicationSchema = z.object({
  status: z.enum(STATUSES).optional(),
  applied_date: dateOnly,
  assessment_date: dateTime,
  interview_date: dateTime,
  notes: z.string().trim().max(2000).optional(),
}).refine((data) => Object.keys(data).length > 0, { message: 'Provide at least one field to update.' });

const upcomingQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).optional().default(30),
});

module.exports = { STATUSES, createApplicationSchema, updateApplicationSchema, upcomingQuerySchema };
