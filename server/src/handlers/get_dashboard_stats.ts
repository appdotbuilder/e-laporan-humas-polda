import { db } from '../db';
import { reportsTable, usersTable } from '../db/schema';
import { type DashboardStats } from '../schema';
import { eq, count, desc, and } from 'drizzle-orm';
import { sql, type SQL } from 'drizzle-orm';

export async function getDashboardStats(userId: number, userRole: string): Promise<DashboardStats> {
  try {
    // Build conditions based on user role
    const conditions: SQL<unknown>[] = [];
    
    // Staff users can only see their own reports
    if (userRole === 'STAFF') {
      conditions.push(eq(reportsTable.created_by, userId));
    }
    // PIMPINAN and ADMIN can see all reports (no additional conditions)

    // Get counts by status
    const statsQueries = await Promise.all([
      // Total reports count
      db.select({ count: count() })
        .from(reportsTable)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .execute(),

      // Draft reports count
      db.select({ count: count() })
        .from(reportsTable)
        .where(conditions.length > 0 
          ? and(...conditions, eq(reportsTable.status, 'DRAFT'))
          : eq(reportsTable.status, 'DRAFT'))
        .execute(),

      // Submitted reports count
      db.select({ count: count() })
        .from(reportsTable)
        .where(conditions.length > 0 
          ? and(...conditions, eq(reportsTable.status, 'SUBMITTED'))
          : eq(reportsTable.status, 'SUBMITTED'))
        .execute(),

      // Approved reports count
      db.select({ count: count() })
        .from(reportsTable)
        .where(conditions.length > 0 
          ? and(...conditions, eq(reportsTable.status, 'APPROVED'))
          : eq(reportsTable.status, 'APPROVED'))
        .execute(),

      // Rejected reports count
      db.select({ count: count() })
        .from(reportsTable)
        .where(conditions.length > 0 
          ? and(...conditions, eq(reportsTable.status, 'REJECTED'))
          : eq(reportsTable.status, 'REJECTED'))
        .execute()
    ]);

    // Get recent reports (last 10) - build query conditionally
    const recentResults = conditions.length > 0
      ? await db.select({
          id: reportsTable.id,
          title: reportsTable.title,
          activity_date: reportsTable.activity_date,
          start_time: reportsTable.start_time,
          end_time: reportsTable.end_time,
          description: reportsTable.description,
          location: reportsTable.location,
          participants: reportsTable.participants,
          status: reportsTable.status,
          created_by: reportsTable.created_by,
          created_at: reportsTable.created_at,
          updated_at: reportsTable.updated_at
        })
        .from(reportsTable)
        .where(and(...conditions))
        .orderBy(desc(reportsTable.created_at))
        .limit(10)
        .execute()
      : await db.select({
          id: reportsTable.id,
          title: reportsTable.title,
          activity_date: reportsTable.activity_date,
          start_time: reportsTable.start_time,
          end_time: reportsTable.end_time,
          description: reportsTable.description,
          location: reportsTable.location,
          participants: reportsTable.participants,
          status: reportsTable.status,
          created_by: reportsTable.created_by,
          created_at: reportsTable.created_at,
          updated_at: reportsTable.updated_at
        })
        .from(reportsTable)
        .orderBy(desc(reportsTable.created_at))
        .limit(10)
        .execute();

    return {
      total_reports: statsQueries[0][0].count,
      draft_reports: statsQueries[1][0].count,
      submitted_reports: statsQueries[2][0].count,
      approved_reports: statsQueries[3][0].count,
      rejected_reports: statsQueries[4][0].count,
      recent_reports: recentResults
    };
  } catch (error) {
    console.error('Dashboard stats retrieval failed:', error);
    throw error;
  }
}