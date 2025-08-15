import { type UploadAttachmentInput, type ReportAttachment } from '../schema';

export async function uploadAttachment(input: UploadAttachmentInput, userId: number): Promise<ReportAttachment> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is to save attachment metadata to database
    // after file has been uploaded to storage.
    // Should verify that user owns the report or has permission to add attachments.
    return Promise.resolve({
        id: 0, // Placeholder ID
        report_id: input.report_id,
        filename: input.filename,
        original_filename: input.original_filename,
        file_path: input.file_path,
        file_size: input.file_size,
        mime_type: input.mime_type,
        uploaded_at: new Date()
    } as ReportAttachment);
}