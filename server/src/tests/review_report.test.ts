import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, reportsTable, reportCommentsTable } from '../db/schema';
import { type ReviewReportInput } from '../schema';
import { reviewReport } from '../handlers/review_report';
import { eq } from 'drizzle-orm';

describe('reviewReport', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Create test users and report
  let pimpinianUser: any;
  let adminUser: any;
  let staffUser: any;
  let testReport: any;

  const setupTestData = async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          username: 'pimpinan1',
          email: 'pimpinan@test.com',
          password_hash: 'hashed_password',
          full_name: 'Test Pimpinan',
          role: 'PIMPINAN'
        },
        {
          username: 'admin1',
          email: 'admin@test.com',
          password_hash: 'hashed_password',
          full_name: 'Test Admin',
          role: 'ADMIN'
        },
        {
          username: 'staff1',
          email: 'staff@test.com',
          password_hash: 'hashed_password',
          full_name: 'Test Staff',
          role: 'STAFF'
        }
      ])
      .returning()
      .execute();

    [pimpinianUser, adminUser, staffUser] = users;

    // Create a test report in SUBMITTED status
    const reports = await db.insert(reportsTable)
      .values({
        title: 'Test Report for Review',
        activity_date: new Date('2024-01-15'),
        start_time: '09:00',
        end_time: '17:00',
        description: 'Test report description',
        location: 'Test location',
        participants: 'Test participants',
        status: 'SUBMITTED',
        created_by: staffUser.id
      })
      .returning()
      .execute();

    testReport = reports[0];
  };

  it('should allow PIMPINAN to approve a submitted report', async () => {
    await setupTestData();

    const input: ReviewReportInput = {
      report_id: testReport.id,
      status: 'APPROVED'
    };

    const result = await reviewReport(input, pimpinianUser.id);

    expect(result.id).toEqual(testReport.id);
    expect(result.status).toEqual('APPROVED');
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify the report was updated in database
    const updatedReport = await db.select()
      .from(reportsTable)
      .where(eq(reportsTable.id, testReport.id))
      .execute();

    expect(updatedReport[0].status).toEqual('APPROVED');
  });

  it('should allow ADMIN to reject a submitted report', async () => {
    await setupTestData();

    const input: ReviewReportInput = {
      report_id: testReport.id,
      status: 'REJECTED'
    };

    const result = await reviewReport(input, adminUser.id);

    expect(result.id).toEqual(testReport.id);
    expect(result.status).toEqual('REJECTED');
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify the report was updated in database
    const updatedReport = await db.select()
      .from(reportsTable)
      .where(eq(reportsTable.id, testReport.id))
      .execute();

    expect(updatedReport[0].status).toEqual('REJECTED');
  });

  it('should add comment when provided', async () => {
    await setupTestData();

    const input: ReviewReportInput = {
      report_id: testReport.id,
      status: 'APPROVED',
      comment: 'Great work on this report!'
    };

    await reviewReport(input, pimpinianUser.id);

    // Verify comment was added
    const comments = await db.select()
      .from(reportCommentsTable)
      .where(eq(reportCommentsTable.report_id, testReport.id))
      .execute();

    expect(comments).toHaveLength(1);
    expect(comments[0].comment).toEqual('Great work on this report!');
    expect(comments[0].user_id).toEqual(pimpinianUser.id);
    expect(comments[0].created_at).toBeInstanceOf(Date);
  });

  it('should not add comment when empty string provided', async () => {
    await setupTestData();

    const input: ReviewReportInput = {
      report_id: testReport.id,
      status: 'APPROVED',
      comment: ''
    };

    await reviewReport(input, pimpinianUser.id);

    // Verify no comment was added
    const comments = await db.select()
      .from(reportCommentsTable)
      .where(eq(reportCommentsTable.report_id, testReport.id))
      .execute();

    expect(comments).toHaveLength(0);
  });

  it('should trim whitespace from comments', async () => {
    await setupTestData();

    const input: ReviewReportInput = {
      report_id: testReport.id,
      status: 'REJECTED',
      comment: '  Please revise the content  '
    };

    await reviewReport(input, adminUser.id);

    // Verify comment was trimmed
    const comments = await db.select()
      .from(reportCommentsTable)
      .where(eq(reportCommentsTable.report_id, testReport.id))
      .execute();

    expect(comments[0].comment).toEqual('Please revise the content');
  });

  it('should reject review by STAFF user', async () => {
    await setupTestData();

    const input: ReviewReportInput = {
      report_id: testReport.id,
      status: 'APPROVED'
    };

    await expect(reviewReport(input, staffUser.id))
      .rejects.toThrow(/insufficient permissions/i);
  });

  it('should reject review by non-existent user', async () => {
    await setupTestData();

    const input: ReviewReportInput = {
      report_id: testReport.id,
      status: 'APPROVED'
    };

    await expect(reviewReport(input, 999999))
      .rejects.toThrow(/user not found/i);
  });

  it('should reject review of non-existent report', async () => {
    await setupTestData();

    const input: ReviewReportInput = {
      report_id: 999999,
      status: 'APPROVED'
    };

    await expect(reviewReport(input, pimpinianUser.id))
      .rejects.toThrow(/report not found/i);
  });

  it('should reject review of non-submitted report', async () => {
    await setupTestData();

    // Create a report in DRAFT status
    const draftReport = await db.insert(reportsTable)
      .values({
        title: 'Draft Report',
        activity_date: new Date('2024-01-16'),
        start_time: '09:00',
        end_time: '17:00',
        description: 'Draft report description',
        location: 'Test location',
        participants: 'Test participants',
        status: 'DRAFT',
        created_by: staffUser.id
      })
      .returning()
      .execute();

    const input: ReviewReportInput = {
      report_id: draftReport[0].id,
      status: 'APPROVED'
    };

    await expect(reviewReport(input, pimpinianUser.id))
      .rejects.toThrow(/only submitted reports can be reviewed/i);
  });

  it('should handle already approved report', async () => {
    await setupTestData();

    // First approve the report
    await db.update(reportsTable)
      .set({ status: 'APPROVED' })
      .where(eq(reportsTable.id, testReport.id))
      .execute();

    const input: ReviewReportInput = {
      report_id: testReport.id,
      status: 'REJECTED'
    };

    await expect(reviewReport(input, pimpinianUser.id))
      .rejects.toThrow(/only submitted reports can be reviewed/i);
  });
});