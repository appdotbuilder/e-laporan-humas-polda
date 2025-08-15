import { db } from '../db';
import { reportAttachmentsTable, reportsTable } from '../db/schema';
import { type UploadAttachmentInput, type ReportAttachment } from '../schema';
import { eq } from 'drizzle-orm';

export const uploadAttachment = async (input: UploadAttachmentInput, userId: number): Promise<ReportAttachment> => {
  try {
    // First, verify that the report exists and the user has permission to add attachments
    const report = await db.select()
      .from(reportsTable)
      .where(eq(reportsTable.id, input.report_id))
      .execute();

    if (!report || report.length === 0) {
      throw new Error('Report not found');
    }

    // Check if user owns the report (only report creators can add attachments)
    if (report[0].created_by !== userId) {
      throw new Error('Permission denied: Only report creators can add attachments');
    }

    // Insert attachment record
    const result = await db.insert(reportAttachmentsTable)
      .values({
        report_id: input.report_id,
        filename: input.filename,
        original_filename: input.original_filename,
        file_path: input.file_path,
        file_size: input.file_size,
        mime_type: input.mime_type
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Attachment upload failed:', error);
    throw error;
  }
};