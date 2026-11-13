const { z } = require('zod');

const progressSchema = z.object({
  completed: z.boolean(),
});

const noteSchema = z.object({
  title: z.string().trim().min(2, 'Add a short note title.').max(180),
  body: z.string().trim().min(1, 'Write your note before saving.').max(5000),
});

module.exports = { progressSchema, noteSchema };
