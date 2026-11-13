const { z } = require('zod');

const generateRoadmapSchema = z.object({
  role: z.string().trim().min(2).max(120).optional(),
  use_ai: z.boolean().optional().default(false),
});

const taskSchema = z.object({
  title: z.string().trim().min(3, 'Enter a task title.').max(220),
  description: z.string().trim().max(1200).optional(),
  resource_url: z.union([z.string().trim().url('Enter a valid URL.').max(500), z.literal('')]).optional(),
  priority: z.enum(['high', 'medium', 'low']).optional().default('medium'),
  target_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a target date.'),
});

const updateTaskSchema = z.object({
  title: z.string().trim().min(3).max(220).optional(),
  description: z.string().trim().max(1200).optional(),
  resource_url: z.union([z.string().trim().url('Enter a valid URL.').max(500), z.literal('')]).optional(),
  priority: z.enum(['high', 'medium', 'low']).optional(),
  target_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a target date.').optional(),
  is_completed: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0, { message: 'Provide at least one field to update.' });

module.exports = { generateRoadmapSchema, taskSchema, updateTaskSchema };
