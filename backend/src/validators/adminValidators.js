const { z } = require('zod');

const studentQuerySchema = z.object({
  search: z.string().trim().max(120).optional().default(''),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
  status: z.enum(['active', 'inactive']).optional().or(z.literal('')).default(''),
});

const studentStatusSchema = z.object({
  is_active: z.boolean(),
});

const resourceSchema = z.object({
  title: z.string().trim().min(3, 'Enter a resource title.').max(200),
  url: z.string().trim().url('Enter a valid URL including https://.').max(500),
  provider: z.string().trim().max(120).optional().or(z.literal('')),
  resource_type: z.enum(['docs', 'course', 'video', 'practice', 'article']).default('article'),
  is_free: z.boolean().optional().default(true),
  topic_id: z.union([z.coerce.number().int().positive(), z.null(), z.literal('')]).optional(),
});

module.exports = { studentQuerySchema, studentStatusSchema, resourceSchema };
