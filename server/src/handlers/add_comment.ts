import { db } from '../db';
import { reportCommentsTable, reportsTable } from '../db/schema';
import { type AddCommentInput, type ReportComment } from '../schema';
import { eq } from 'drizzle-orm';

export async function addComment(input: AddCommentInput, userId: number): Promise<ReportComment> {
  try {
    // First verify that the report exists
    const existingReport = await db.select()
      .from(reportsTable)
      .where(eq(reportsTable.id, input.report_id))
      .execute();

    if (existingReport.length === 0) {
      throw new Error('Report not found');
    }

    // Insert the comment
    const result = await db.insert(reportCommentsTable)
      .values({
        report_id: input.report_id,
        user_id: userId,
        comment: input.comment
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Comment creation failed:', error);
    throw error;
  }
}