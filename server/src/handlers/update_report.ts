import { db } from '../db';
import { reportsTable, usersTable } from '../db/schema';
import { type UpdateReportInput, type Report } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function updateReport(input: UpdateReportInput, userId: number): Promise<Report> {
  try {
    // First, get the current user's role to determine permissions
    const userResult = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    if (!userResult || userResult.length === 0) {
      throw new Error('User not found');
    }

    const user = userResult[0];

    // Get the existing report
    const existingReportResult = await db.select()
      .from(reportsTable)
      .where(eq(reportsTable.id, input.id))
      .execute();

    if (!existingReportResult || existingReportResult.length === 0) {
      throw new Error('Report not found');
    }

    const existingReport = existingReportResult[0];

    // Check permissions:
    // - STAFF can only update their own reports and only if status is DRAFT
    // - PIMPINAN and ADMIN can update any report
    if (user.role === 'STAFF') {
      if (existingReport.created_by !== userId) {
        throw new Error('Staff users can only update their own reports');
      }
      if (existingReport.status !== 'DRAFT') {
        throw new Error('Staff users can only update reports in DRAFT status');
      }
    }

    // Build update object with only provided fields
    const updateData: Partial<typeof reportsTable.$inferInsert> = {
      updated_at: new Date()
    };

    if (input.title !== undefined) {
      updateData.title = input.title;
    }
    if (input.activity_date !== undefined) {
      updateData.activity_date = input.activity_date;
    }
    if (input.start_time !== undefined) {
      updateData.start_time = input.start_time;
    }
    if (input.end_time !== undefined) {
      updateData.end_time = input.end_time;
    }
    if (input.description !== undefined) {
      updateData.description = input.description;
    }
    if (input.location !== undefined) {
      updateData.location = input.location;
    }
    if (input.participants !== undefined) {
      updateData.participants = input.participants;
    }
    if (input.status !== undefined) {
      updateData.status = input.status;
    }

    // Update the report
    const result = await db.update(reportsTable)
      .set(updateData)
      .where(eq(reportsTable.id, input.id))
      .returning()
      .execute();

    if (!result || result.length === 0) {
      throw new Error('Failed to update report');
    }

    return result[0];
  } catch (error) {
    console.error('Report update failed:', error);
    throw error;
  }
}