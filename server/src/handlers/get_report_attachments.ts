import { db } from '../db';
import { reportsTable, reportAttachmentsTable } from '../db/schema';
import { type ReportAttachment } from '../schema';
import { eq, and } from 'drizzle-orm';

export const getReportAttachments = async (reportId: number, userId: number, userRole: string): Promise<ReportAttachment[]> => {
  try {
    // First verify the report exists and user has access to it
    const report = await db.select()
      .from(reportsTable)
      .where(eq(reportsTable.id, reportId))
      .limit(1)
      .execute();

    if (!report || report.length === 0) {
      throw new Error('Report not found');
    }

    // Check access permissions
    // ADMIN and PIMPINAN can access all reports
    // STAFF can only access their own reports
    const reportData = report[0];
    if (userRole === 'STAFF' && reportData.created_by !== userId) {
      throw new Error('Access denied: You can only view attachments for your own reports');
    }

    // Fetch all attachments for the report
    const attachments = await db.select()
      .from(reportAttachmentsTable)
      .where(eq(reportAttachmentsTable.report_id, reportId))
      .orderBy(reportAttachmentsTable.uploaded_at)
      .execute();

    return attachments;
  } catch (error) {
    console.error('Failed to get report attachments:', error);
    throw error;
  }
};