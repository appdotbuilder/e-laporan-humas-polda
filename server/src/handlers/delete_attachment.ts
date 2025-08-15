import { db } from '../db';
import { reportAttachmentsTable, reportsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';

export async function deleteAttachment(attachmentId: number, userId: number, userRole: string): Promise<boolean> {
  try {
    // First, get the attachment details and verify it exists
    const attachmentResults = await db.select({
      id: reportAttachmentsTable.id,
      report_id: reportAttachmentsTable.report_id,
      file_path: reportAttachmentsTable.file_path,
      created_by: reportsTable.created_by
    })
    .from(reportAttachmentsTable)
    .innerJoin(reportsTable, eq(reportAttachmentsTable.report_id, reportsTable.id))
    .where(eq(reportAttachmentsTable.id, attachmentId))
    .execute();

    // Check if attachment exists
    if (attachmentResults.length === 0) {
      return false;
    }

    const attachment = attachmentResults[0];

    // Permission check: User can delete if they own the report OR they are ADMIN/PIMPINAN
    const canDelete = attachment.created_by === userId || 
                     userRole === 'ADMIN' || 
                     userRole === 'PIMPINAN';

    if (!canDelete) {
      return false;
    }

    // Delete from database
    const deleteResult = await db.delete(reportAttachmentsTable)
      .where(eq(reportAttachmentsTable.id, attachmentId))
      .execute();

    // If database deletion successful, try to delete the physical file
    if (deleteResult.rowCount && deleteResult.rowCount > 0) {
      try {
        // Check if file exists before attempting to delete
        if (existsSync(attachment.file_path)) {
          await unlink(attachment.file_path);
        }
        // Note: We don't fail the operation if file deletion fails
        // as the database record is already deleted
      } catch (fileError) {
        console.error('Failed to delete physical file:', fileError);
        // Still return true as database deletion succeeded
      }
      
      return true;
    }

    return false;
  } catch (error) {
    console.error('Attachment deletion failed:', error);
    throw error;
  }
}