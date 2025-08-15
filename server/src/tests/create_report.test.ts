import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, reportsTable } from '../db/schema';
import { type CreateReportInput } from '../schema';
import { createReport } from '../handlers/create_report';
import { eq } from 'drizzle-orm';

describe('createReport', () => {
  let testUserId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create a test user for the reports
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test User',
        role: 'STAFF'
      })
      .returning()
      .execute();
    
    testUserId = userResult[0].id;
  });

  afterEach(resetDB);

  const testInput: CreateReportInput = {
    title: 'Daily Activity Report',
    activity_date: new Date('2024-01-15'),
    start_time: '09:00',
    end_time: '17:00',
    description: 'Completed various tasks throughout the day including meetings and documentation.',
    location: 'Main Office',
    participants: 'John Doe, Jane Smith, Bob Wilson',
    status: 'DRAFT'
  };

  it('should create a report with all fields', async () => {
    const result = await createReport(testInput, testUserId);

    // Basic field validation
    expect(result.title).toEqual('Daily Activity Report');
    expect(result.activity_date).toEqual(new Date('2024-01-15'));
    expect(result.start_time).toEqual('09:00');
    expect(result.end_time).toEqual('17:00');
    expect(result.description).toEqual(testInput.description);
    expect(result.location).toEqual('Main Office');
    expect(result.participants).toEqual('John Doe, Jane Smith, Bob Wilson');
    expect(result.status).toEqual('DRAFT');
    expect(result.created_by).toEqual(testUserId);
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save report to database', async () => {
    const result = await createReport(testInput, testUserId);

    // Query the database to verify the report was saved
    const reports = await db.select()
      .from(reportsTable)
      .where(eq(reportsTable.id, result.id))
      .execute();

    expect(reports).toHaveLength(1);
    const savedReport = reports[0];
    expect(savedReport.title).toEqual('Daily Activity Report');
    expect(savedReport.activity_date).toEqual(new Date('2024-01-15'));
    expect(savedReport.start_time).toEqual('09:00');
    expect(savedReport.end_time).toEqual('17:00');
    expect(savedReport.description).toEqual(testInput.description);
    expect(savedReport.location).toEqual('Main Office');
    expect(savedReport.participants).toEqual('John Doe, Jane Smith, Bob Wilson');
    expect(savedReport.status).toEqual('DRAFT');
    expect(savedReport.created_by).toEqual(testUserId);
    expect(savedReport.created_at).toBeInstanceOf(Date);
    expect(savedReport.updated_at).toBeInstanceOf(Date);
  });

  it('should default status to DRAFT when not provided', async () => {
    const inputWithoutStatus: CreateReportInput = {
      title: 'Report Without Status',
      activity_date: new Date('2024-01-16'),
      start_time: '08:00',
      end_time: '16:00',
      description: 'A report without explicit status.',
      location: 'Remote',
      participants: 'Solo work'
    };

    const result = await createReport(inputWithoutStatus, testUserId);

    expect(result.status).toEqual('DRAFT');

    // Verify in database
    const reports = await db.select()
      .from(reportsTable)
      .where(eq(reportsTable.id, result.id))
      .execute();

    expect(reports[0].status).toEqual('DRAFT');
  });

  it('should handle different time formats correctly', async () => {
    const timeTestInput: CreateReportInput = {
      title: 'Time Format Test',
      activity_date: new Date('2024-01-17'),
      start_time: '07:30',
      end_time: '15:45',
      description: 'Testing time format handling.',
      location: 'Test Location',
      participants: 'Test Participant'
    };

    const result = await createReport(timeTestInput, testUserId);

    expect(result.start_time).toEqual('07:30');
    expect(result.end_time).toEqual('15:45');

    // Verify in database
    const reports = await db.select()
      .from(reportsTable)
      .where(eq(reportsTable.id, result.id))
      .execute();

    expect(reports[0].start_time).toEqual('07:30');
    expect(reports[0].end_time).toEqual('15:45');
  });

  it('should handle different statuses correctly', async () => {
    const submittedInput: CreateReportInput = {
      title: 'Submitted Report',
      activity_date: new Date('2024-01-18'),
      start_time: '09:00',
      end_time: '17:00',
      description: 'A submitted report.',
      location: 'Office',
      participants: 'Team Members',
      status: 'SUBMITTED'
    };

    const result = await createReport(submittedInput, testUserId);

    expect(result.status).toEqual('SUBMITTED');

    // Verify in database
    const reports = await db.select()
      .from(reportsTable)
      .where(eq(reportsTable.id, result.id))
      .execute();

    expect(reports[0].status).toEqual('SUBMITTED');
  });

  it('should reject creation with non-existent user ID', async () => {
    const nonExistentUserId = 99999;

    await expect(() => createReport(testInput, nonExistentUserId))
      .toThrow(/user with id 99999 not found/i);
  });

  it('should handle long text fields correctly', async () => {
    const longTextInput: CreateReportInput = {
      title: 'Report with Long Content',
      activity_date: new Date('2024-01-19'),
      start_time: '08:00',
      end_time: '18:00',
      description: 'This is a very long description that contains multiple sentences and detailed information about the activities performed throughout the day. It includes various tasks, meetings, accomplishments, and challenges faced during the work period. The description provides comprehensive coverage of all activities and their outcomes.',
      location: 'Multiple Locations including Main Office, Conference Room A, and Client Site',
      participants: 'John Doe (Project Manager), Jane Smith (Developer), Bob Wilson (Designer), Alice Brown (QA Tester), Charlie Davis (Business Analyst), Eva Martinez (UI/UX Designer)'
    };

    const result = await createReport(longTextInput, testUserId);

    expect(result.description).toEqual(longTextInput.description);
    expect(result.location).toEqual(longTextInput.location);
    expect(result.participants).toEqual(longTextInput.participants);

    // Verify in database
    const reports = await db.select()
      .from(reportsTable)
      .where(eq(reportsTable.id, result.id))
      .execute();

    expect(reports[0].description).toEqual(longTextInput.description);
    expect(reports[0].location).toEqual(longTextInput.location);
    expect(reports[0].participants).toEqual(longTextInput.participants);
  });
});