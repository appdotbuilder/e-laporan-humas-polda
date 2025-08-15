import { db } from '../db';
import { reportsTable, reportCommentsTable, usersTable } from '../db/schema';
import { type ReviewReportInput, type Report } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function reviewReport(input: ReviewReportInput, userId: number): Promise<Report> {
  try {
    // First, verify the user has permission to review reports (PIMPINAN or ADMIN)
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    if (user.length === 0) {
      throw new Error('User not found');
    }

    if (!['PIMPINAN', 'ADMIN'].includes(user[0].role)) {
      throw new Error('Insufficient permissions to review reports');
    }

    // Check if the report exists and is in SUBMITTED status
    const existingReport = await db.select()
      .from(reportsTable)
      .where(eq(reportsTable.id, input.report_id))
      .execute();

    if (existingReport.length === 0) {
      throw new Error('Report not found');
    }

    if (existingReport[0].status !== 'SUBMITTED') {
      throw new Error('Only submitted reports can be reviewed');
    }

    // Update the report status
    const updatedReports = await db.update(reportsTable)
      .set({
        status: input.status,
        updated_at: new Date()
      })
      .where(eq(reportsTable.id, input.report_id))
      .returning()
      .execute();

    // If comment is provided, add it to report comments
    if (input.comment && input.comment.trim().length > 0) {
      await db.insert(reportCommentsTable)
        .values({
          report_id: input.report_id,
          user_id: userId,
          comment: input.comment.trim()
        })
        .execute();
    }

    return updatedReports[0];
  } catch (error) {
    console.error('Report review failed:', error);
    throw error;
  }
}