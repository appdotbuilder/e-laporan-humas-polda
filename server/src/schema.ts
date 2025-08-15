import { z } from 'zod';

// User role enum
export const userRoleSchema = z.enum(['STAFF', 'PIMPINAN', 'ADMIN']);
export type UserRole = z.infer<typeof userRoleSchema>;

// Report status enum
export const reportStatusSchema = z.enum(['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED']);
export type ReportStatus = z.infer<typeof reportStatusSchema>;

// User schema
export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string().email(),
  password_hash: z.string(),
  full_name: z.string(),
  role: userRoleSchema,
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Report schema
export const reportSchema = z.object({
  id: z.number(),
  title: z.string(),
  activity_date: z.coerce.date(),
  start_time: z.string(), // HH:MM format
  end_time: z.string(), // HH:MM format
  description: z.string(),
  location: z.string(),
  participants: z.string(),
  status: reportStatusSchema,
  created_by: z.number(), // Foreign key to users table
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Report = z.infer<typeof reportSchema>;

// Report attachment schema
export const reportAttachmentSchema = z.object({
  id: z.number(),
  report_id: z.number(), // Foreign key to reports table
  filename: z.string(),
  original_filename: z.string(),
  file_path: z.string(),
  file_size: z.number(),
  mime_type: z.string(),
  uploaded_at: z.coerce.date()
});

export type ReportAttachment = z.infer<typeof reportAttachmentSchema>;

// Report comment schema
export const reportCommentSchema = z.object({
  id: z.number(),
  report_id: z.number(), // Foreign key to reports table
  user_id: z.number(), // Foreign key to users table
  comment: z.string(),
  created_at: z.coerce.date()
});

export type ReportComment = z.infer<typeof reportCommentSchema>;

// Input schemas for user operations
export const registerUserInputSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(6),
  full_name: z.string().min(1).max(100),
  role: userRoleSchema
});

export type RegisterUserInput = z.infer<typeof registerUserInputSchema>;

export const loginInputSchema = z.object({
  username: z.string(),
  password: z.string()
});

export type LoginInput = z.infer<typeof loginInputSchema>;

export const updateUserProfileInputSchema = z.object({
  id: z.number(),
  email: z.string().email().optional(),
  full_name: z.string().min(1).max(100).optional(),
  password: z.string().min(6).optional()
});

export type UpdateUserProfileInput = z.infer<typeof updateUserProfileInputSchema>;

// Input schemas for report operations
export const createReportInputSchema = z.object({
  title: z.string().min(1).max(200),
  activity_date: z.coerce.date(),
  start_time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/), // HH:MM format validation
  end_time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/), // HH:MM format validation
  description: z.string().min(1),
  location: z.string().min(1).max(200),
  participants: z.string().min(1),
  status: reportStatusSchema.optional() // Default to DRAFT
});

export type CreateReportInput = z.infer<typeof createReportInputSchema>;

export const updateReportInputSchema = z.object({
  id: z.number(),
  title: z.string().min(1).max(200).optional(),
  activity_date: z.coerce.date().optional(),
  start_time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  end_time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  description: z.string().min(1).optional(),
  location: z.string().min(1).max(200).optional(),
  participants: z.string().min(1).optional(),
  status: reportStatusSchema.optional()
});

export type UpdateReportInput = z.infer<typeof updateReportInputSchema>;

// Input schema for report filtering and searching
export const getReportsInputSchema = z.object({
  status: reportStatusSchema.optional(),
  created_by: z.number().optional(),
  activity_date_from: z.coerce.date().optional(),
  activity_date_to: z.coerce.date().optional(),
  search: z.string().optional(), // For searching in title, description, location
  limit: z.number().int().positive().max(100).default(20),
  offset: z.number().int().nonnegative().default(0)
});

export type GetReportsInput = z.infer<typeof getReportsInputSchema>;

// Input schema for report approval/rejection
export const reviewReportInputSchema = z.object({
  report_id: z.number(),
  status: z.enum(['APPROVED', 'REJECTED']),
  comment: z.string().optional()
});

export type ReviewReportInput = z.infer<typeof reviewReportInputSchema>;

// Input schema for adding comments
export const addCommentInputSchema = z.object({
  report_id: z.number(),
  comment: z.string().min(1)
});

export type AddCommentInput = z.infer<typeof addCommentInputSchema>;

// Input schema for file upload
export const uploadAttachmentInputSchema = z.object({
  report_id: z.number(),
  filename: z.string(),
  original_filename: z.string(),
  file_path: z.string(),
  file_size: z.number().positive(),
  mime_type: z.string()
});

export type UploadAttachmentInput = z.infer<typeof uploadAttachmentInputSchema>;

// Dashboard statistics schema
export const dashboardStatsSchema = z.object({
  total_reports: z.number(),
  draft_reports: z.number(),
  submitted_reports: z.number(),
  approved_reports: z.number(),
  rejected_reports: z.number(),
  recent_reports: z.array(reportSchema).max(10)
});

export type DashboardStats = z.infer<typeof dashboardStatsSchema>;