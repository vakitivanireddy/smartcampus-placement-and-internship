const { z } = require('zod');

const APTITUDE_CATEGORIES = ['quantitative', 'logical', 'verbal'];

const answerSchema = z.object({
  question_id: z.number().int().positive(),
  selected_option: z.union([z.number().int().min(0).max(3), z.null()]).optional(),
});

const submitAttemptSchema = z.object({
  answers: z.array(answerSchema).min(1, 'Answer at least one question before submitting.').max(100),
  category: z.enum(APTITUDE_CATEGORIES).nullable().optional(),
  time_spent_seconds: z.number().int().min(0).max(86400).optional().default(0),
});

const submitMockTestSchema = z.object({
  answers: z.array(answerSchema).min(1, 'Answer at least one question before submitting.').max(100),
  time_spent_seconds: z.number().int().min(0).max(86400).optional().default(0),
});

module.exports = { APTITUDE_CATEGORIES, submitAttemptSchema, submitMockTestSchema };
