import { z } from 'zod';

/**
 * Schema for creating a User record in the database
 * This data comes from Cognito after signup, so no complex sanitization needed
 */
export const UserSchema = z.object({
  givenName: z.string().min(1, {
    message: 'Given name is required',
  }),
  familyName: z.string().min(1, {
    message: 'Family name is required',
  }),
  email: z.string().email({
    message: 'Valid email is required',
  }),
  phoneNumber: z.string().optional(),
});

export type UserFormData = z.infer<typeof UserSchema>;

/**
 * Schema for creating a Topic with document upload
 * Validates title, description, and file metadata before upload
 */
export const TopicUploadSchema = z.object({
  title: z
    .string()
    .min(1, { message: 'Title is required' })
    .max(200, { message: 'Title must be less than 200 characters' })
    .trim(),
  description: z
    .string()
    .min(1, { message: 'Description is required' })
    .max(1000, { message: 'Description must be less than 1000 characters' })
    .trim(),
  fileName: z.string().min(1, { message: 'File name is required' }),
  fileSize: z
    .number()
    .max(10 * 1024 * 1024, { message: 'File size must be less than 10 MB' }),
  fileType: z
    .string()
    .refine((type) => type === 'application/pdf', {
      message: 'Only PDF files are allowed',
    }),
});

export type TopicUploadFormData = z.infer<typeof TopicUploadSchema>;
