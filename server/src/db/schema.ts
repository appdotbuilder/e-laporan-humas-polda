import { serial, text, pgTable, timestamp, integer, pgEnum, varchar } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Define enums
export const userRoleEnum = pgEnum('user_role', ['STAFF', 'PIMPINAN', 'ADMIN']);
export const reportStatusEnum = pgEnum('report_status', ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  email: varchar('email', { length: 100 }).notNull().unique(),
  password_hash: text('password_hash').notNull(),
  full_name: varchar('full_name', { length: 100 }).notNull(),
  role: userRoleEnum('role').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Reports table
export const reportsTable = pgTable('reports', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 200 }).notNull(),
  activity_date: timestamp('activity_date', { mode: 'date' }).notNull(),
  start_time: varchar('start_time', { length: 5 }).notNull(), // HH:MM format
  end_time: varchar('end_time', { length: 5 }).notNull(), // HH:MM format
  description: text('description').notNull(),
  location: varchar('location', { length: 200 }).notNull(),
  participants: text('participants').notNull(),
  status: reportStatusEnum('status').notNull().default('DRAFT'),
  created_by: integer('created_by').notNull().references(() => usersTable.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Report attachments table
export const reportAttachmentsTable = pgTable('report_attachments', {
  id: serial('id').primaryKey(),
  report_id: integer('report_id').notNull().references(() => reportsTable.id, { onDelete: 'cascade' }),
  filename: varchar('filename', { length: 255 }).notNull(),
  original_filename: varchar('original_filename', { length: 255 }).notNull(),
  file_path: text('file_path').notNull(),
  file_size: integer('file_size').notNull(),
  mime_type: varchar('mime_type', { length: 100 }).notNull(),
  uploaded_at: timestamp('uploaded_at').defaultNow().notNull(),
});

// Report comments table
export const reportCommentsTable = pgTable('report_comments', {
  id: serial('id').primaryKey(),
  report_id: integer('report_id').notNull().references(() => reportsTable.id, { onDelete: 'cascade' }),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  comment: text('comment').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Define relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  reports: many(reportsTable),
  comments: many(reportCommentsTable),
}));

export const reportsRelations = relations(reportsTable, ({ one, many }) => ({
  creator: one(usersTable, {
    fields: [reportsTable.created_by],
    references: [usersTable.id],
  }),
  attachments: many(reportAttachmentsTable),
  comments: many(reportCommentsTable),
}));

export const reportAttachmentsRelations = relations(reportAttachmentsTable, ({ one }) => ({
  report: one(reportsTable, {
    fields: [reportAttachmentsTable.report_id],
    references: [reportsTable.id],
  }),
}));

export const reportCommentsRelations = relations(reportCommentsTable, ({ one }) => ({
  report: one(reportsTable, {
    fields: [reportCommentsTable.report_id],
    references: [reportsTable.id],
  }),
  user: one(usersTable, {
    fields: [reportCommentsTable.user_id],
    references: [usersTable.id],
  }),
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;

export type Report = typeof reportsTable.$inferSelect;
export type NewReport = typeof reportsTable.$inferInsert;

export type ReportAttachment = typeof reportAttachmentsTable.$inferSelect;
export type NewReportAttachment = typeof reportAttachmentsTable.$inferInsert;

export type ReportComment = typeof reportCommentsTable.$inferSelect;
export type NewReportComment = typeof reportCommentsTable.$inferInsert;

// Export all tables for proper query building
export const tables = {
  users: usersTable,
  reports: reportsTable,
  reportAttachments: reportAttachmentsTable,
  reportComments: reportCommentsTable,
};