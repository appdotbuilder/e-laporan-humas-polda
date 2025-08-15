import { db } from '../db';
import { reportsTable } from '../db/schema';
import { type Report } from '../schema';
import { eq } from 'drizzle-orm';

export async function getReportById(reportId: number, userId: number, userRole: string): Promise<Report | null> {
  try {
    // Fetch the report from database
    const results = await db.select()
      .from(reportsTable)
      .where(eq(reportsTable.id, reportId))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const report = results[0];

    // Check access permissions
    // STAFF can only view their own reports
    // PIMPINAN and ADMIN can view any report
    if (userRole === 'STAFF' && report.created_by !== userId) {
      return null; // Access denied - return null to indicate report not found
    }

    // Return the report with proper type conversion
    return {
      ...report,
      // Convert timestamp fields to Date objects
      activity_date: report.activity_date,
      created_at: report.created_at,
      updated_at: report.updated_at
    };
  } catch (error) {
    console.error('Failed to fetch report by ID:', error);
    throw error;
  }
}