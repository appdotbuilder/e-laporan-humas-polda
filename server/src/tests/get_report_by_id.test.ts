import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, reportsTable } from '../db/schema';
import { getReportById } from '../handlers/get_report_by_id';

describe('getReportById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let staffUser: any;
  let adminUser: any;
  let pimpinanUser: any;
  let testReport: any;

  beforeEach(async () => {
    // Create test users
    const staffResult = await db.insert(usersTable)
      .values({
        username: 'staffuser',
        email: 'staff@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Staff User',
        role: 'STAFF'
      })
      .returning()
      .execute();
    staffUser = staffResult[0];

    const adminResult = await db.insert(usersTable)
      .values({
        username: 'adminuser',
        email: 'admin@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Admin User',
        role: 'ADMIN'
      })
      .returning()
      .execute();
    adminUser = adminResult[0];

    const pimpinanResult = await db.insert(usersTable)
      .values({
        username: 'pimpinanuser',
        email: 'pimpinan@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Pimpinan User',
        role: 'PIMPINAN'
      })
      .returning()
      .execute();
    pimpinanUser = pimpinanResult[0];

    // Create a test report
    const reportResult = await db.insert(reportsTable)
      .values({
        title: 'Test Report',
        activity_date: new Date('2024-01-15'),
        start_time: '09:00',
        end_time: '17:00',
        description: 'Test report description',
        location: 'Test Location',
        participants: 'John Doe, Jane Smith',
        status: 'DRAFT',
        created_by: staffUser.id
      })
      .returning()
      .execute();
    testReport = reportResult[0];
  });

  it('should return report when staff user views their own report', async () => {
    const result = await getReportById(testReport.id, staffUser.id, 'STAFF');

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(testReport.id);
    expect(result!.title).toEqual('Test Report');
    expect(result!.description).toEqual('Test report description');
    expect(result!.location).toEqual('Test Location');
    expect(result!.start_time).toEqual('09:00');
    expect(result!.end_time).toEqual('17:00');
    expect(result!.participants).toEqual('John Doe, Jane Smith');
    expect(result!.status).toEqual('DRAFT');
    expect(result!.created_by).toEqual(staffUser.id);
    expect(result!.activity_date).toBeInstanceOf(Date);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when staff user tries to view another user\'s report', async () => {
    const result = await getReportById(testReport.id, adminUser.id, 'STAFF');

    expect(result).toBeNull();
  });

  it('should return report when admin views any report', async () => {
    const result = await getReportById(testReport.id, adminUser.id, 'ADMIN');

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(testReport.id);
    expect(result!.title).toEqual('Test Report');
    expect(result!.created_by).toEqual(staffUser.id);
  });

  it('should return report when pimpinan views any report', async () => {
    const result = await getReportById(testReport.id, pimpinanUser.id, 'PIMPINAN');

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(testReport.id);
    expect(result!.title).toEqual('Test Report');
    expect(result!.created_by).toEqual(staffUser.id);
  });

  it('should return null for non-existent report', async () => {
    const nonExistentId = 99999;
    const result = await getReportById(nonExistentId, staffUser.id, 'STAFF');

    expect(result).toBeNull();
  });

  it('should return null for non-existent report even for admin', async () => {
    const nonExistentId = 99999;
    const result = await getReportById(nonExistentId, adminUser.id, 'ADMIN');

    expect(result).toBeNull();
  });

  it('should handle different report statuses correctly', async () => {
    // Create report with different status
    const submittedReportResult = await db.insert(reportsTable)
      .values({
        title: 'Submitted Report',
        activity_date: new Date('2024-01-20'),
        start_time: '10:00',
        end_time: '16:00',
        description: 'Submitted report description',
        location: 'Office',
        participants: 'Team members',
        status: 'SUBMITTED',
        created_by: staffUser.id
      })
      .returning()
      .execute();

    const result = await getReportById(submittedReportResult[0].id, staffUser.id, 'STAFF');

    expect(result).not.toBeNull();
    expect(result!.status).toEqual('SUBMITTED');
  });

  it('should correctly handle date fields', async () => {
    const result = await getReportById(testReport.id, staffUser.id, 'STAFF');

    expect(result).not.toBeNull();
    expect(result!.activity_date).toBeInstanceOf(Date);
    expect(result!.activity_date.getFullYear()).toEqual(2024);
    expect(result!.activity_date.getMonth()).toEqual(0); // January is 0
    expect(result!.activity_date.getDate()).toEqual(15);
  });

  it('should preserve all report fields correctly', async () => {
    const result = await getReportById(testReport.id, adminUser.id, 'ADMIN');

    expect(result).not.toBeNull();
    
    // Verify all fields are present and correct
    const expectedFields = [
      'id', 'title', 'activity_date', 'start_time', 'end_time', 
      'description', 'location', 'participants', 'status', 
      'created_by', 'created_at', 'updated_at'
    ];
    
    expectedFields.forEach(field => {
      expect(result).toHaveProperty(field);
      expect(result![field as keyof typeof result]).toBeDefined();
    });
  });
});