import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, reportsTable } from '../db/schema';
import { type UpdateReportInput } from '../schema';
import { updateReport } from '../handlers/update_report';
import { eq } from 'drizzle-orm';

// Test users data
const staffUser = {
  username: 'staff_user',
  email: 'staff@test.com',
  password_hash: 'hashed_password',
  full_name: 'Staff User',
  role: 'STAFF' as const
};

const adminUser = {
  username: 'admin_user',
  email: 'admin@test.com',
  password_hash: 'hashed_password',
  full_name: 'Admin User',
  role: 'ADMIN' as const
};

const pimpinanUser = {
  username: 'pimpinan_user',
  email: 'pimpinan@test.com',
  password_hash: 'hashed_password',
  full_name: 'Pimpinan User',
  role: 'PIMPINAN' as const
};

// Test report data
const testReport = {
  title: 'Original Report Title',
  activity_date: new Date('2024-01-15'),
  start_time: '09:00',
  end_time: '17:00',
  description: 'Original description',
  location: 'Original Location',
  participants: 'Original participants',
  status: 'DRAFT' as const
};

// Test update input
const updateInput: UpdateReportInput = {
  id: 1, // Will be set dynamically in tests
  title: 'Updated Report Title',
  activity_date: new Date('2024-01-20'),
  start_time: '10:00',
  end_time: '16:00',
  description: 'Updated description',
  location: 'Updated Location',
  participants: 'Updated participants',
  status: 'SUBMITTED'
};

describe('updateReport', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update a report successfully when user owns it', async () => {
    // Create staff user
    const userResult = await db.insert(usersTable)
      .values(staffUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create report owned by the user
    const reportResult = await db.insert(reportsTable)
      .values({
        ...testReport,
        created_by: userId
      })
      .returning()
      .execute();
    const reportId = reportResult[0].id;

    // Update the report
    const result = await updateReport({
      ...updateInput,
      id: reportId
    }, userId);

    // Verify all fields were updated
    expect(result.id).toEqual(reportId);
    expect(result.title).toEqual('Updated Report Title');
    expect(result.activity_date).toEqual(new Date('2024-01-20'));
    expect(result.start_time).toEqual('10:00');
    expect(result.end_time).toEqual('16:00');
    expect(result.description).toEqual('Updated description');
    expect(result.location).toEqual('Updated Location');
    expect(result.participants).toEqual('Updated participants');
    expect(result.status).toEqual('SUBMITTED');
    expect(result.created_by).toEqual(userId);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update report in database', async () => {
    // Create staff user
    const userResult = await db.insert(usersTable)
      .values(staffUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create report
    const reportResult = await db.insert(reportsTable)
      .values({
        ...testReport,
        created_by: userId
      })
      .returning()
      .execute();
    const reportId = reportResult[0].id;

    // Update the report
    await updateReport({
      ...updateInput,
      id: reportId
    }, userId);

    // Verify database was updated
    const updatedReports = await db.select()
      .from(reportsTable)
      .where(eq(reportsTable.id, reportId))
      .execute();

    expect(updatedReports).toHaveLength(1);
    const updatedReport = updatedReports[0];
    expect(updatedReport.title).toEqual('Updated Report Title');
    expect(updatedReport.description).toEqual('Updated description');
    expect(updatedReport.status).toEqual('SUBMITTED');
    expect(updatedReport.updated_at).toBeInstanceOf(Date);
  });

  it('should allow partial updates', async () => {
    // Create staff user
    const userResult = await db.insert(usersTable)
      .values(staffUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create report
    const reportResult = await db.insert(reportsTable)
      .values({
        ...testReport,
        created_by: userId
      })
      .returning()
      .execute();
    const reportId = reportResult[0].id;

    // Update only title and description
    const partialUpdate: UpdateReportInput = {
      id: reportId,
      title: 'Partially Updated Title',
      description: 'Partially updated description'
    };

    const result = await updateReport(partialUpdate, userId);

    // Verify only specified fields were updated
    expect(result.title).toEqual('Partially Updated Title');
    expect(result.description).toEqual('Partially updated description');
    // Other fields should remain unchanged
    expect(result.activity_date).toEqual(testReport.activity_date);
    expect(result.start_time).toEqual(testReport.start_time);
    expect(result.end_time).toEqual(testReport.end_time);
    expect(result.location).toEqual(testReport.location);
    expect(result.participants).toEqual(testReport.participants);
    expect(result.status).toEqual(testReport.status);
  });

  it('should allow admin to update any report', async () => {
    // Create staff user who owns the report
    const staffResult = await db.insert(usersTable)
      .values(staffUser)
      .returning()
      .execute();
    const staffUserId = staffResult[0].id;

    // Create admin user
    const adminResult = await db.insert(usersTable)
      .values(adminUser)
      .returning()
      .execute();
    const adminUserId = adminResult[0].id;

    // Create report owned by staff user
    const reportResult = await db.insert(reportsTable)
      .values({
        ...testReport,
        created_by: staffUserId,
        status: 'SUBMITTED' // Non-draft status
      })
      .returning()
      .execute();
    const reportId = reportResult[0].id;

    // Admin should be able to update the report
    const result = await updateReport({
      id: reportId,
      title: 'Admin Updated Title',
      status: 'APPROVED'
    }, adminUserId);

    expect(result.title).toEqual('Admin Updated Title');
    expect(result.status).toEqual('APPROVED');
    expect(result.created_by).toEqual(staffUserId); // Original owner unchanged
  });

  it('should allow pimpinan to update any report', async () => {
    // Create staff user who owns the report
    const staffResult = await db.insert(usersTable)
      .values(staffUser)
      .returning()
      .execute();
    const staffUserId = staffResult[0].id;

    // Create pimpinan user
    const pimpinanResult = await db.insert(usersTable)
      .values(pimpinanUser)
      .returning()
      .execute();
    const pimpinanUserId = pimpinanResult[0].id;

    // Create report owned by staff user
    const reportResult = await db.insert(reportsTable)
      .values({
        ...testReport,
        created_by: staffUserId,
        status: 'SUBMITTED' // Non-draft status
      })
      .returning()
      .execute();
    const reportId = reportResult[0].id;

    // Pimpinan should be able to update the report
    const result = await updateReport({
      id: reportId,
      title: 'Pimpinan Updated Title',
      status: 'REJECTED'
    }, pimpinanUserId);

    expect(result.title).toEqual('Pimpinan Updated Title');
    expect(result.status).toEqual('REJECTED');
    expect(result.created_by).toEqual(staffUserId); // Original owner unchanged
  });

  it('should throw error when staff user tries to update others report', async () => {
    // Create two staff users
    const staff1Result = await db.insert(usersTable)
      .values(staffUser)
      .returning()
      .execute();
    const staff1Id = staff1Result[0].id;

    const staff2Result = await db.insert(usersTable)
      .values({
        ...staffUser,
        username: 'staff_user_2',
        email: 'staff2@test.com'
      })
      .returning()
      .execute();
    const staff2Id = staff2Result[0].id;

    // Create report owned by staff1
    const reportResult = await db.insert(reportsTable)
      .values({
        ...testReport,
        created_by: staff1Id
      })
      .returning()
      .execute();
    const reportId = reportResult[0].id;

    // Staff2 tries to update staff1's report
    await expect(updateReport({
      id: reportId,
      title: 'Unauthorized Update'
    }, staff2Id)).rejects.toThrow(/staff users can only update their own reports/i);
  });

  it('should throw error when staff user tries to update non-draft report', async () => {
    // Create staff user
    const userResult = await db.insert(usersTable)
      .values(staffUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create submitted report owned by the user
    const reportResult = await db.insert(reportsTable)
      .values({
        ...testReport,
        created_by: userId,
        status: 'SUBMITTED' // Non-draft status
      })
      .returning()
      .execute();
    const reportId = reportResult[0].id;

    // Staff user tries to update submitted report
    await expect(updateReport({
      id: reportId,
      title: 'Trying to update submitted report'
    }, userId)).rejects.toThrow(/staff users can only update reports in draft status/i);
  });

  it('should throw error when user does not exist', async () => {
    // Create a report first (need valid user for creation)
    const userResult = await db.insert(usersTable)
      .values(staffUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    const reportResult = await db.insert(reportsTable)
      .values({
        ...testReport,
        created_by: userId
      })
      .returning()
      .execute();
    const reportId = reportResult[0].id;

    // Try to update with non-existent user
    await expect(updateReport({
      id: reportId,
      title: 'Update with invalid user'
    }, 99999)).rejects.toThrow(/user not found/i);
  });

  it('should throw error when report does not exist', async () => {
    // Create staff user
    const userResult = await db.insert(usersTable)
      .values(staffUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Try to update non-existent report
    await expect(updateReport({
      id: 99999,
      title: 'Update non-existent report'
    }, userId)).rejects.toThrow(/report not found/i);
  });

  it('should update updated_at timestamp', async () => {
    // Create staff user
    const userResult = await db.insert(usersTable)
      .values(staffUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create report
    const reportResult = await db.insert(reportsTable)
      .values({
        ...testReport,
        created_by: userId
      })
      .returning()
      .execute();
    const reportId = reportResult[0].id;
    const originalUpdatedAt = reportResult[0].updated_at;

    // Wait a bit to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    // Update the report
    const result = await updateReport({
      id: reportId,
      title: 'Updated to test timestamp'
    }, userId);

    // Verify updated_at was changed
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > originalUpdatedAt).toBe(true);
  });
});