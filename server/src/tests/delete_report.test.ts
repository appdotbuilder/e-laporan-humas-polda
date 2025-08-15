import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, reportsTable, reportCommentsTable, reportAttachmentsTable } from '../db/schema';
import { deleteReport } from '../handlers/delete_report';
import { eq } from 'drizzle-orm';

describe('deleteReport', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create a test user
  const createTestUser = async (role: 'STAFF' | 'PIMPINAN' | 'ADMIN' = 'STAFF') => {
    const result = await db.insert(usersTable)
      .values({
        username: `testuser_${Date.now()}`,
        email: `test_${Date.now()}@example.com`,
        password_hash: 'hashed_password',
        full_name: 'Test User',
        role: role
      })
      .returning()
      .execute();

    return result[0];
  };

  // Helper function to create a test report
  const createTestReport = async (createdBy: number) => {
    const result = await db.insert(reportsTable)
      .values({
        title: 'Test Report',
        activity_date: new Date('2024-01-15'),
        start_time: '09:00',
        end_time: '17:00',
        description: 'Test report description',
        location: 'Test Location',
        participants: 'Test participants',
        status: 'DRAFT',
        created_by: createdBy
      })
      .returning()
      .execute();

    return result[0];
  };

  it('should delete a report when user owns it', async () => {
    const user = await createTestUser();
    const report = await createTestReport(user.id);

    const result = await deleteReport(report.id, user.id, user.role);

    expect(result).toBe(true);

    // Verify report is deleted from database
    const reports = await db.select()
      .from(reportsTable)
      .where(eq(reportsTable.id, report.id))
      .execute();

    expect(reports).toHaveLength(0);
  });

  it('should delete a report when user is PIMPINAN', async () => {
    const staffUser = await createTestUser('STAFF');
    const pimpinanUser = await createTestUser('PIMPINAN');
    const report = await createTestReport(staffUser.id);

    const result = await deleteReport(report.id, pimpinanUser.id, pimpinanUser.role);

    expect(result).toBe(true);

    // Verify report is deleted from database
    const reports = await db.select()
      .from(reportsTable)
      .where(eq(reportsTable.id, report.id))
      .execute();

    expect(reports).toHaveLength(0);
  });

  it('should delete a report when user is ADMIN', async () => {
    const staffUser = await createTestUser('STAFF');
    const adminUser = await createTestUser('ADMIN');
    const report = await createTestReport(staffUser.id);

    const result = await deleteReport(report.id, adminUser.id, adminUser.role);

    expect(result).toBe(true);

    // Verify report is deleted from database
    const reports = await db.select()
      .from(reportsTable)
      .where(eq(reportsTable.id, report.id))
      .execute();

    expect(reports).toHaveLength(0);
  });

  it('should return false when user does not own report and is not PIMPINAN/ADMIN', async () => {
    const user1 = await createTestUser('STAFF');
    const user2 = await createTestUser('STAFF');
    const report = await createTestReport(user1.id);

    const result = await deleteReport(report.id, user2.id, user2.role);

    expect(result).toBe(false);

    // Verify report still exists in database
    const reports = await db.select()
      .from(reportsTable)
      .where(eq(reportsTable.id, report.id))
      .execute();

    expect(reports).toHaveLength(1);
  });

  it('should return false when report does not exist', async () => {
    const user = await createTestUser();
    const nonExistentReportId = 99999;

    const result = await deleteReport(nonExistentReportId, user.id, user.role);

    expect(result).toBe(false);
  });

  it('should cascade delete report comments when report is deleted', async () => {
    const user = await createTestUser();
    const report = await createTestReport(user.id);

    // Create a comment for the report
    await db.insert(reportCommentsTable)
      .values({
        report_id: report.id,
        user_id: user.id,
        comment: 'Test comment'
      })
      .execute();

    // Verify comment exists before deletion
    const commentsBefore = await db.select()
      .from(reportCommentsTable)
      .where(eq(reportCommentsTable.report_id, report.id))
      .execute();

    expect(commentsBefore).toHaveLength(1);

    // Delete the report
    const result = await deleteReport(report.id, user.id, user.role);
    expect(result).toBe(true);

    // Verify comments are also deleted due to cascade
    const commentsAfter = await db.select()
      .from(reportCommentsTable)
      .where(eq(reportCommentsTable.report_id, report.id))
      .execute();

    expect(commentsAfter).toHaveLength(0);
  });

  it('should cascade delete report attachments when report is deleted', async () => {
    const user = await createTestUser();
    const report = await createTestReport(user.id);

    // Create an attachment for the report
    await db.insert(reportAttachmentsTable)
      .values({
        report_id: report.id,
        filename: 'test_file.pdf',
        original_filename: 'original_test_file.pdf',
        file_path: '/uploads/test_file.pdf',
        file_size: 1024,
        mime_type: 'application/pdf'
      })
      .execute();

    // Verify attachment exists before deletion
    const attachmentsBefore = await db.select()
      .from(reportAttachmentsTable)
      .where(eq(reportAttachmentsTable.report_id, report.id))
      .execute();

    expect(attachmentsBefore).toHaveLength(1);

    // Delete the report
    const result = await deleteReport(report.id, user.id, user.role);
    expect(result).toBe(true);

    // Verify attachments are also deleted due to cascade
    const attachmentsAfter = await db.select()
      .from(reportAttachmentsTable)
      .where(eq(reportAttachmentsTable.report_id, report.id))
      .execute();

    expect(attachmentsAfter).toHaveLength(0);
  });

  it('should handle different report statuses correctly', async () => {
    const user = await createTestUser();

    // Test with different statuses
    const statuses = ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'] as const;

    for (const status of statuses) {
      const report = await db.insert(reportsTable)
        .values({
          title: `Test Report - ${status}`,
          activity_date: new Date('2024-01-15'),
          start_time: '09:00',
          end_time: '17:00',
          description: 'Test report description',
          location: 'Test Location',
          participants: 'Test participants',
          status: status,
          created_by: user.id
        })
        .returning()
        .execute();

      const result = await deleteReport(report[0].id, user.id, user.role);
      expect(result).toBe(true);

      // Verify report is deleted
      const reports = await db.select()
        .from(reportsTable)
        .where(eq(reportsTable.id, report[0].id))
        .execute();

      expect(reports).toHaveLength(0);
    }
  });
});