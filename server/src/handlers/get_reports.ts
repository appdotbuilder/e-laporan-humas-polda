import { db } from '../db';
import { reportsTable } from '../db/schema';
import { type GetReportsInput, type Report } from '../schema';
import { eq, gte, lte, ilike, or, and, desc, count, type SQL } from 'drizzle-orm';

export async function getReports(input: GetReportsInput, userId: number, userRole: string): Promise<{ reports: Report[]; total: number }> {
  try {
    // Build conditions array
    const conditions: SQL<unknown>[] = [];

    // Role-based access control
    if (userRole === 'STAFF') {
      // Staff can only see their own reports
      conditions.push(eq(reportsTable.created_by, userId));
    }
    // PIMPINAN and ADMIN can see all reports, so no additional condition needed

    // Apply filters
    if (input.status) {
      conditions.push(eq(reportsTable.status, input.status));
    }

    if (input.created_by) {
      // Only allow PIMPINAN/ADMIN to filter by created_by
      if (userRole !== 'STAFF') {
        conditions.push(eq(reportsTable.created_by, input.created_by));
      }
    }

    if (input.activity_date_from) {
      conditions.push(gte(reportsTable.activity_date, input.activity_date_from));
    }

    if (input.activity_date_to) {
      conditions.push(lte(reportsTable.activity_date, input.activity_date_to));
    }

    if (input.search) {
      const searchTerm = `%${input.search}%`;
      const searchCondition = or(
        ilike(reportsTable.title, searchTerm),
        ilike(reportsTable.description, searchTerm),
        ilike(reportsTable.location, searchTerm)
      );
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }

    // Build the where clause
    const whereClause = conditions.length === 0 
      ? undefined 
      : conditions.length === 1 
        ? conditions[0] 
        : and(...conditions);

    // Build and execute the main query
    const reportsQuery = db.select({
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
    .$dynamic();

    // Build and execute the count query
    const countQuery = db.select({ count: count() })
      .from(reportsTable)
      .$dynamic();

    // Apply where clause if conditions exist
    const finalReportsQuery = whereClause 
      ? reportsQuery.where(whereClause)
      : reportsQuery;

    const finalCountQuery = whereClause 
      ? countQuery.where(whereClause)
      : countQuery;

    // Apply ordering and pagination to reports query
    const paginatedQuery = finalReportsQuery
      .orderBy(desc(reportsTable.created_at))
      .limit(input.limit)
      .offset(input.offset);

    // Execute both queries
    const [reports, totalResult] = await Promise.all([
      paginatedQuery.execute(),
      finalCountQuery.execute()
    ]);

    const total = totalResult[0]?.count || 0;

    return {
      reports,
      total
    };
  } catch (error) {
    console.error('Get reports failed:', error);
    throw error;
  }
}