import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, reportsTable } from '../db/schema';
import { getDashboardStats } from '../handlers/get_dashboard_stats';

// Test user data
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

describe('getDashboardStats', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty stats when no reports exist', async () => {
    // Create a user
    const users = await db.insert(usersTable)
      .values([staffUser])
      .returning()
      .execute();

    const result = await getDashboardStats(users[0].id, 'STAFF');

    expect(result.total_reports).toEqual(0);
    expect(result.draft_reports).toEqual(0);
    expect(result.submitted_reports).toEqual(0);
    expect(result.approved_reports).toEqual(0);
    expect(result.rejected_reports).toEqual(0);
    expect(result.recent_reports).toEqual([]);
  });

  it('should return correct stats for STAFF user with own reports', async () => {
    // Create users
    const users = await db.insert(usersTable)
      .values([staffUser, adminUser])
      .returning()
      .execute();

    const staffUserId = users[0].id;
    const adminUserId = users[1].id;

    // Create reports for staff user - insert one by one to ensure proper ordering
    const staffReport1 = await db.insert(reportsTable)
      .values({
        title: 'Staff Report 1',
        activity_date: new Date('2024-01-15'),
        start_time: '09:00',
        end_time: '12:00',
        description: 'Staff report description 1',
        location: 'Office A',
        participants: 'Team A',
        status: 'DRAFT' as const,
        created_by: staffUserId
      })
      .execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const staffReport2 = await db.insert(reportsTable)
      .values({
        title: 'Staff Report 2',
        activity_date: new Date('2024-01-16'),
        start_time: '10:00',
        end_time: '15:00',
        description: 'Staff report description 2',
        location: 'Office B',
        participants: 'Team B',
        status: 'SUBMITTED' as const,
        created_by: staffUserId
      })
      .execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const staffReport3 = await db.insert(reportsTable)
      .values({
        title: 'Staff Report 3',
        activity_date: new Date('2024-01-17'),
        start_time: '08:00',
        end_time: '11:00',
        description: 'Staff report description 3',
        location: 'Office C',
        participants: 'Team C',
        status: 'APPROVED' as const,
        created_by: staffUserId
      })
      .execute();

    // Create report for admin user (should not be included in staff stats)
    await new Promise(resolve => setTimeout(resolve, 10));
    
    await db.insert(reportsTable)
      .values({
        title: 'Admin Report',
        activity_date: new Date('2024-01-18'),
        start_time: '14:00',
        end_time: '16:00',
        description: 'Admin report description',
        location: 'Admin Office',
        participants: 'Admin Team',
        status: 'REJECTED' as const,
        created_by: adminUserId
      })
      .execute();

    const result = await getDashboardStats(staffUserId, 'STAFF');

    // Staff user should only see their own reports
    expect(result.total_reports).toEqual(3);
    expect(result.draft_reports).toEqual(1);
    expect(result.submitted_reports).toEqual(1);
    expect(result.approved_reports).toEqual(1);
    expect(result.rejected_reports).toEqual(0);
    expect(result.recent_reports).toHaveLength(3);

    // Verify recent reports are ordered by creation date (newest first)
    const recentTitles = result.recent_reports.map(r => r.title);
    expect(recentTitles).toEqual(['Staff Report 3', 'Staff Report 2', 'Staff Report 1']);

    // Verify report structure
    const firstReport = result.recent_reports[0];
    expect(firstReport.id).toBeDefined();
    expect(firstReport.title).toEqual('Staff Report 3');
    expect(firstReport.activity_date).toBeInstanceOf(Date);
    expect(firstReport.start_time).toEqual('08:00');
    expect(firstReport.end_time).toEqual('11:00');
    expect(firstReport.description).toEqual('Staff report description 3');
    expect(firstReport.location).toEqual('Office C');
    expect(firstReport.participants).toEqual('Team C');
    expect(firstReport.status).toEqual('APPROVED');
    expect(firstReport.created_by).toEqual(staffUserId);
    expect(firstReport.created_at).toBeInstanceOf(Date);
    expect(firstReport.updated_at).toBeInstanceOf(Date);
  });

  it('should return all reports stats for ADMIN user', async () => {
    // Create users
    const users = await db.insert(usersTable)
      .values([staffUser, adminUser])
      .returning()
      .execute();

    const staffUserId = users[0].id;
    const adminUserId = users[1].id;

    // Create mixed reports - insert sequentially to ensure proper ordering
    await db.insert(reportsTable)
      .values({
        title: 'Staff Draft Report',
        activity_date: new Date('2024-01-15'),
        start_time: '09:00',
        end_time: '12:00',
        description: 'Staff draft report',
        location: 'Office A',
        participants: 'Team A',
        status: 'DRAFT' as const,
        created_by: staffUserId
      })
      .execute();

    await new Promise(resolve => setTimeout(resolve, 10));

    await db.insert(reportsTable)
      .values({
        title: 'Admin Submitted Report',
        activity_date: new Date('2024-01-16'),
        start_time: '10:00',
        end_time: '15:00',
        description: 'Admin submitted report',
        location: 'Office B',
        participants: 'Team B',
        status: 'SUBMITTED' as const,
        created_by: adminUserId
      })
      .execute();

    await new Promise(resolve => setTimeout(resolve, 10));

    await db.insert(reportsTable)
      .values({
        title: 'Staff Approved Report',
        activity_date: new Date('2024-01-17'),
        start_time: '08:00',
        end_time: '11:00',
        description: 'Staff approved report',
        location: 'Office C',
        participants: 'Team C',
        status: 'APPROVED' as const,
        created_by: staffUserId
      })
      .execute();

    await new Promise(resolve => setTimeout(resolve, 10));

    await db.insert(reportsTable)
      .values({
        title: 'Admin Rejected Report',
        activity_date: new Date('2024-01-18'),
        start_time: '14:00',
        end_time: '16:00',
        description: 'Admin rejected report',
        location: 'Admin Office',
        participants: 'Admin Team',
        status: 'REJECTED' as const,
        created_by: adminUserId
      })
      .execute();

    const result = await getDashboardStats(adminUserId, 'ADMIN');

    // Admin should see all reports
    expect(result.total_reports).toEqual(4);
    expect(result.draft_reports).toEqual(1);
    expect(result.submitted_reports).toEqual(1);
    expect(result.approved_reports).toEqual(1);
    expect(result.rejected_reports).toEqual(1);
    expect(result.recent_reports).toHaveLength(4);

    // Verify recent reports include both staff and admin reports
    const recentTitles = result.recent_reports.map(r => r.title);
    expect(recentTitles).toEqual([
      'Admin Rejected Report',
      'Staff Approved Report', 
      'Admin Submitted Report',
      'Staff Draft Report'
    ]);
  });

  it('should return all reports stats for PIMPINAN user', async () => {
    // Create users
    const users = await db.insert(usersTable)
      .values([staffUser, pimpinanUser])
      .returning()
      .execute();

    const staffUserId = users[0].id;
    const pimpinanUserId = users[1].id;

    // Create reports from different users - insert sequentially
    await db.insert(reportsTable)
      .values({
        title: 'Staff Report',
        activity_date: new Date('2024-01-15'),
        start_time: '09:00',
        end_time: '12:00',
        description: 'Staff report description',
        location: 'Office A',
        participants: 'Team A',
        status: 'SUBMITTED' as const,
        created_by: staffUserId
      })
      .execute();

    await new Promise(resolve => setTimeout(resolve, 10));

    await db.insert(reportsTable)
      .values({
        title: 'Pimpinan Report',
        activity_date: new Date('2024-01-16'),
        start_time: '10:00',
        end_time: '15:00',
        description: 'Pimpinan report description',
        location: 'Office B',
        participants: 'Team B',
        status: 'APPROVED' as const,
        created_by: pimpinanUserId
      })
      .execute();

    const result = await getDashboardStats(pimpinanUserId, 'PIMPINAN');

    // PIMPINAN should see all reports
    expect(result.total_reports).toEqual(2);
    expect(result.draft_reports).toEqual(0);
    expect(result.submitted_reports).toEqual(1);
    expect(result.approved_reports).toEqual(1);
    expect(result.rejected_reports).toEqual(0);
    expect(result.recent_reports).toHaveLength(2);
  });

  it('should limit recent reports to 10 items', async () => {
    // Create user
    const users = await db.insert(usersTable)
      .values([staffUser])
      .returning()
      .execute();

    const staffUserId = users[0].id;

    // Create 15 reports sequentially to ensure proper timestamp ordering
    for (let i = 0; i < 15; i++) {
      await db.insert(reportsTable)
        .values({
          title: `Report ${i + 1}`,
          activity_date: new Date(`2024-01-${String(i + 1).padStart(2, '0')}`),
          start_time: '09:00',
          end_time: '12:00',
          description: `Report description ${i + 1}`,
          location: `Office ${i + 1}`,
          participants: `Team ${i + 1}`,
          status: 'DRAFT' as const,
          created_by: staffUserId
        })
        .execute();
      
      // Small delay between inserts to ensure different timestamps
      if (i < 14) {
        await new Promise(resolve => setTimeout(resolve, 5));
      }
    }

    const result = await getDashboardStats(staffUserId, 'STAFF');

    expect(result.total_reports).toEqual(15);
    expect(result.recent_reports).toHaveLength(10);

    // Should return most recent 10 reports
    const recentTitles = result.recent_reports.map(r => r.title);
    expect(recentTitles).toEqual([
      'Report 15', 'Report 14', 'Report 13', 'Report 12', 'Report 11',
      'Report 10', 'Report 9', 'Report 8', 'Report 7', 'Report 6'
    ]);
  });

  it('should handle mixed status counts correctly', async () => {
    // Create user
    const users = await db.insert(usersTable)
      .values([adminUser])
      .returning()
      .execute();

    const adminUserId = users[0].id;

    // Create reports with various statuses - using bulk insert is fine for status counting
    const reports = [
      // 3 DRAFT reports
      ...Array.from({ length: 3 }, (_, i) => ({
        title: `Draft Report ${i + 1}`,
        activity_date: new Date('2024-01-15'),
        start_time: '09:00',
        end_time: '12:00',
        description: `Draft description ${i + 1}`,
        location: 'Office A',
        participants: 'Team A',
        status: 'DRAFT' as const,
        created_by: adminUserId
      })),
      // 2 SUBMITTED reports
      ...Array.from({ length: 2 }, (_, i) => ({
        title: `Submitted Report ${i + 1}`,
        activity_date: new Date('2024-01-16'),
        start_time: '10:00',
        end_time: '15:00',
        description: `Submitted description ${i + 1}`,
        location: 'Office B',
        participants: 'Team B',
        status: 'SUBMITTED' as const,
        created_by: adminUserId
      })),
      // 4 APPROVED reports
      ...Array.from({ length: 4 }, (_, i) => ({
        title: `Approved Report ${i + 1}`,
        activity_date: new Date('2024-01-17'),
        start_time: '08:00',
        end_time: '11:00',
        description: `Approved description ${i + 1}`,
        location: 'Office C',
        participants: 'Team C',
        status: 'APPROVED' as const,
        created_by: adminUserId
      })),
      // 1 REJECTED report
      {
        title: 'Rejected Report',
        activity_date: new Date('2024-01-18'),
        start_time: '14:00',
        end_time: '16:00',
        description: 'Rejected description',
        location: 'Office D',
        participants: 'Team D',
        status: 'REJECTED' as const,
        created_by: adminUserId
      }
    ];

    await db.insert(reportsTable)
      .values(reports)
      .execute();

    const result = await getDashboardStats(adminUserId, 'ADMIN');

    expect(result.total_reports).toEqual(10);
    expect(result.draft_reports).toEqual(3);
    expect(result.submitted_reports).toEqual(2);
    expect(result.approved_reports).toEqual(4);
    expect(result.rejected_reports).toEqual(1);
    expect(result.recent_reports).toHaveLength(10);
  });
});