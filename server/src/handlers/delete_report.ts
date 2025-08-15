import { db } from '../db';
import { reportsTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export const deleteReport = async (reportId: number, userId: number, userRole: string): Promise<boolean> => {
  try {
    // First, check if the report exists and get its details
    const report = await db.select()
      .from(reportsTable)
      .where(eq(reportsTable.id, reportId))
      .execute();

    if (report.length === 0) {
      return false; // Report not found
    }

    const reportData = report[0];

    // Check permissions: user must own the report OR be PIMPINAN/ADMIN
    const canDelete = reportData.created_by === userId || 
                     userRole === 'PIMPINAN' || 
                     userRole === 'ADMIN';

    if (!canDelete) {
      return false; // User doesn't have permission to delete this report
    }

    // Delete the report (CASCADE will automatically delete associated attachments and comments)
    const result = await db.delete(reportsTable)
      .where(eq(reportsTable.id, reportId))
      .execute();

    // Return true if deletion was successful (affected rows > 0)
    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    console.error('Report deletion failed:', error);
    throw error;
  }
};