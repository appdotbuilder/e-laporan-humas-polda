import { db } from '../db';
import { reportsTable, usersTable } from '../db/schema';
import { type CreateReportInput, type Report } from '../schema';
import { eq } from 'drizzle-orm';

export async function createReport(input: CreateReportInput, userId: number): Promise<Report> {
  try {
    // Verify that the user exists before creating the report
    const userExists = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    if (userExists.length === 0) {
      throw new Error(`User with ID ${userId} not found`);
    }

    // Insert the report record
    const result = await db.insert(reportsTable)
      .values({
        title: input.title,
        activity_date: input.activity_date,
        start_time: input.start_time,
        end_time: input.end_time,
        description: input.description,
        location: input.location,
        participants: input.participants,
        status: input.status || 'DRAFT', // Default to DRAFT if not provided
        created_by: userId
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Report creation failed:', error);
    throw error;
  }
}