import { type AddCommentInput, type ReportComment } from '../schema';

export async function addComment(input: AddCommentInput, userId: number): Promise<ReportComment> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is to add a comment to a report.
    // Should verify that user has access to the report.
    return Promise.resolve({
        id: 0, // Placeholder ID
        report_id: input.report_id,
        user_id: userId,
        comment: input.comment,
        created_at: new Date()
    } as ReportComment);
}