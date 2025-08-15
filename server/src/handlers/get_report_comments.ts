import { type ReportComment } from '../schema';

export async function getReportComments(reportId: number, userId: number, userRole: string): Promise<ReportComment[]> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is to fetch all comments for a specific report.
    // Should verify that user has access to the report.
    return Promise.resolve([]);
}