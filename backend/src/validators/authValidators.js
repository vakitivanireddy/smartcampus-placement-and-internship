const { z } = require('zod');

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .max(128, 'Password is too long.')
  .regex(/[A-Z]/, 'Password must include an uppercase letter.')
  .regex(/[a-z]/, 'Password must include a lowercase letter.')
  .regex(/[0-9]/, 'Password must include a number.');

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Enter a valid email address.')
  .max(190);

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name.').max(120),
  email: emailSchema,
  password: passwordSchema,
  college: z.string().trim().max(180).optional().or(z.literal('')),
  branch: z.string().trim().max(80).optional().or(z.literal('')),
  graduationYear: z.coerce.number().int().min(2000).max(2100).optional().nullable(),
  cgpa: z.coerce.number().min(0).max(10).optional().nullable(),
  targetRole: z.string().trim().max(120).optional().or(z.literal('')),
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password.'),
});

module.exports = { registerSchema, loginSchema, passwordSchema, emailSchema };
