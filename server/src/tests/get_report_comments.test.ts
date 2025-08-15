import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, reportsTable, reportCommentsTable } from '../db/schema';
import { getReportComments } from '../handlers/get_report_comments';
import { eq } from 'drizzle-orm';


describe('getReportComments', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Test data setup
  let staffUser: any;
  let pimpinanUser: any;
  let adminUser: any;
  let staffReport: any;
  let pimpinanReport: any;

  beforeEach(async () => {
    // Create test users
    const hashedPassword = 'hashed_password_123';

    const staffUserResult = await db.insert(usersTable).values({
      username: 'staff1',
      email: 'staff@test.com',
      password_hash: hashedPassword,
      full_name: 'Staff User',
      role: 'STAFF'
    }).returning().execute();
    staffUser = staffUserResult[0];

    const pimpinanUserResult = await db.insert(usersTable).values({
      username: 'pimpinan1',
      email: 'pimpinan@test.com',
      password_hash: hashedPassword,
      full_name: 'Pimpinan User',
      role: 'PIMPINAN'
    }).returning().execute();
    pimpinanUser = pimpinanUserResult[0];

    const adminUserResult = await db.insert(usersTable).values({
      username: 'admin1',
      email: 'admin@test.com',
      password_hash: hashedPassword,
      full_name: 'Admin User',
      role: 'ADMIN'
    }).returning().execute();
    adminUser = adminUserResult[0];

    // Create test reports
    const staffReportResult = await db.insert(reportsTable).values({
      title: 'Staff Report',
      activity_date: new Date('2024-01-15'),
      start_time: '09:00',
      end_time: '17:00',
      description: 'Daily activity report',
      location: 'Office',
      participants: 'Staff members',
      status: 'SUBMITTED',
      created_by: staffUser.id
    }).returning().execute();
    staffReport = staffReportResult[0];

    const pimpinanReportResult = await db.insert(reportsTable).values({
      title: 'Pimpinan Report',
      activity_date: new Date('2024-01-16'),
      start_time: '10:00',
      end_time: '16:00',
      description: 'Management meeting report',
      location: 'Conference Room',
      participants: 'Management team',
      status: 'APPROVED',
      created_by: pimpinanUser.id
    }).returning().execute();
    pimpinanReport = pimpinanReportResult[0];
  });

  it('should return comments for a report when user has access', async () => {
    // Add some comments to the staff report
    await db.insert(reportCommentsTable).values([
      {
        report_id: staffReport.id,
        user_id: pimpinanUser.id,
        comment: 'Good work on this report!'
      },
      {
        report_id: staffReport.id,
        user_id: adminUser.id,
        comment: 'Please add more details about the budget.'
      }
    ]).execute();

    // Staff user should be able to see comments on their own report
    const comments = await getReportComments(staffReport.id, staffUser.id, 'STAFF');

    expect(comments).toHaveLength(2);
    expect(comments[0].report_id).toBe(staffReport.id);
    expect(comments[0].comment).toBe('Good work on this report!');
    expect(comments[0].user_id).toBe(pimpinanUser.id);
    expect(comments[0].created_at).toBeInstanceOf(Date);

    expect(comments[1].report_id).toBe(staffReport.id);
    expect(comments[1].comment).toBe('Please add more details about the budget.');
    expect(comments[1].user_id).toBe(adminUser.id);
    expect(comments[1].created_at).toBeInstanceOf(Date);
  });

  it('should return empty array when report has no comments', async () => {
    // Staff user accessing their own report with no comments
    const comments = await getReportComments(staffReport.id, staffUser.id, 'STAFF');

    expect(comments).toHaveLength(0);
    expect(Array.isArray(comments)).toBe(true);
  });

  it('should allow PIMPINAN to access any report comments', async () => {
    // Add comment to staff report
    await db.insert(reportCommentsTable).values({
      report_id: staffReport.id,
      user_id: adminUser.id,
      comment: 'Review feedback from admin'
    }).execute();

    // PIMPINAN should be able to access comments on staff report
    const comments = await getReportComments(staffReport.id, pimpinanUser.id, 'PIMPINAN');

    expect(comments).toHaveLength(1);
    expect(comments[0].comment).toBe('Review feedback from admin');
    expect(comments[0].user_id).toBe(adminUser.id);
  });

  it('should allow ADMIN to access any report comments', async () => {
    // Add comment to pimpinan report
    await db.insert(reportCommentsTable).values({
      report_id: pimpinanReport.id,
      user_id: staffUser.id,
      comment: 'Question about the meeting outcomes'
    }).execute();

    // ADMIN should be able to access comments on pimpinan report
    const comments = await getReportComments(pimpinanReport.id, adminUser.id, 'ADMIN');

    expect(comments).toHaveLength(1);
    expect(comments[0].comment).toBe('Question about the meeting outcomes');
    expect(comments[0].user_id).toBe(staffUser.id);
  });

  it('should throw error when STAFF tries to access other user\'s report', async () => {
    // Add comment to pimpinan report
    await db.insert(reportCommentsTable).values({
      report_id: pimpinanReport.id,
      user_id: adminUser.id,
      comment: 'Admin comment on pimpinan report'
    }).execute();

    // Staff user should not be able to access pimpinan's report
    await expect(getReportComments(pimpinanReport.id, staffUser.id, 'STAFF'))
      .rejects.toThrow(/report not found or access denied/i);
  });

  it('should throw error when report does not exist', async () => {
    const nonExistentReportId = 99999;

    await expect(getReportComments(nonExistentReportId, staffUser.id, 'STAFF'))
      .rejects.toThrow(/report not found or access denied/i);
  });

  it('should order comments by creation date', async () => {
    // Create comments with specific timestamps
    const firstComment = await db.insert(reportCommentsTable).values({
      report_id: staffReport.id,
      user_id: pimpinanUser.id,
      comment: 'First comment'
    }).returning().execute();

    // Wait a bit to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const secondComment = await db.insert(reportCommentsTable).values({
      report_id: staffReport.id,
      user_id: adminUser.id,
      comment: 'Second comment'
    }).returning().execute();

    const comments = await getReportComments(staffReport.id, staffUser.id, 'STAFF');

    expect(comments).toHaveLength(2);
    expect(comments[0].comment).toBe('First comment');
    expect(comments[1].comment).toBe('Second comment');
    
    // Verify ordering by timestamp
    expect(comments[0].created_at.getTime()).toBeLessThanOrEqual(comments[1].created_at.getTime());
  });

  it('should handle comments from multiple users correctly', async () => {
    // Add comments from different users
    await db.insert(reportCommentsTable).values([
      {
        report_id: staffReport.id,
        user_id: staffUser.id,
        comment: 'Self comment by staff'
      },
      {
        report_id: staffReport.id,
        user_id: pimpinanUser.id,
        comment: 'Comment from pimpinan'
      },
      {
        report_id: staffReport.id,
        user_id: adminUser.id,
        comment: 'Comment from admin'
      }
    ]).execute();

    const comments = await getReportComments(staffReport.id, staffUser.id, 'STAFF');

    expect(comments).toHaveLength(3);
    
    const userIds = comments.map(c => c.user_id);
    expect(userIds).toContain(staffUser.id);
    expect(userIds).toContain(pimpinanUser.id);
    expect(userIds).toContain(adminUser.id);
  });
});