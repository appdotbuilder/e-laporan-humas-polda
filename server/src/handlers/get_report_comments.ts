import { db } from '../db';
import { reportsTable, reportCommentsTable, usersTable } from '../db/schema';
import { type ReportComment } from '../schema';
import { eq, and, type SQL } from 'drizzle-orm';

export async function getReportComments(reportId: number, userId: number, userRole: string): Promise<ReportComment[]> {
  try {
    // First, verify that the report exists and user has access to it
    // Build conditions array based on role
    const conditions: SQL<unknown>[] = [eq(reportsTable.id, reportId)];
    
    // For STAFF role, they can only access reports they created
    // For PIMPINAN and ADMIN roles, they can access any report
    if (userRole === 'STAFF') {
      conditions.push(eq(reportsTable.created_by, userId));
    }

    const reports = await db.select()
      .from(reportsTable)
      .where(conditions.length === 1 ? conditions[0] : and(...conditions))
      .execute();
    
    if (reports.length === 0) {
      throw new Error('Report not found or access denied');
    }

    // Fetch comments with user information
    const results = await db.select({
      id: reportCommentsTable.id,
      report_id: reportCommentsTable.report_id,
      user_id: reportCommentsTable.user_id,
      comment: reportCommentsTable.comment,
      created_at: reportCommentsTable.created_at,
      user_full_name: usersTable.full_name,
      user_role: usersTable.role
    })
    .from(reportCommentsTable)
    .innerJoin(usersTable, eq(reportCommentsTable.user_id, usersTable.id))
    .where(eq(reportCommentsTable.report_id, reportId))
    .orderBy(reportCommentsTable.created_at)
    .execute();

    // Transform the results to match ReportComment schema
    return results.map(result => ({
      id: result.id,
      report_id: result.report_id,
      user_id: result.user_id,
      comment: result.comment,
      created_at: result.created_at
    }));

  } catch (error) {
    console.error('Failed to get report comments:', error);
    throw error;
  }
}