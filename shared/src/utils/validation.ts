import { z } from 'zod';
import { PostVisibility } from '../types/social';
import { MessageType } from '../types/messaging';

// User validation schemas
export const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username must be at most 30 characters')
  .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores');

export const emailSchema = z
  .string()
  .email('Invalid email format')
  .max(254, 'Email must be at most 254 characters');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/(?=.*[a-z])/, 'Password must contain at least one lowercase letter')
  .regex(/(?=.*[A-Z])/, 'Password must contain at least one uppercase letter')
  .regex(/(?=.*\d)/, 'Password must contain at least one number')
  .regex(/(?=.*[!@#$%^&*])/, 'Password must contain at least one special character');

// Post validation schemas
export const postContentSchema = z
  .string()
  .min(1, 'Post content cannot be empty')
  .max(280, 'Post content must be at most 280 characters')
  .refine(content => content.trim().length > 0, 'Post content cannot be only whitespace');

export const postVisibilitySchema = z.nativeEnum(PostVisibility);

// Message validation schemas
export const messageContentSchema = z
  .string()
  .min(1, 'Message content cannot be empty')
  .max(1000, 'Message content must be at most 1000 characters')
  .refine(content => content.trim().length > 0, 'Message content cannot be only whitespace');

export const messageTypeSchema = z.nativeEnum(MessageType);

// API validation schemas
export const paginationSchema = z.object({
  limit: z.number().min(1).max(100).optional().default(20),
  cursor: z.string().optional()
});

export const idSchema = z.string().uuid('Invalid ID format');

// Request validation schemas
export const loginRequestSchema = z.object({
  username: usernameSchema,
  password: z.string().min(1, 'Password is required')
});

export const registerRequestSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
  verification_proof: z.string().min(1, 'Verification proof is required')
});

export const createPostRequestSchema = z.object({
  content: postContentSchema,
  visibility: postVisibilitySchema
});

export const updatePostRequestSchema = z.object({
  content: postContentSchema,
  visibility: postVisibilitySchema.optional()
});

export const sendMessageRequestSchema = z.object({
  recipient_id: idSchema,
  content: messageContentSchema,
  message_type: messageTypeSchema
});

// Utility functions
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

export function validateInputSafe<T>(
  schema: z.ZodSchema<T>, 
  data: unknown
): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

export function sanitizeHtml(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}