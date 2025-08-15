import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, reportsTable, reportCommentsTable } from '../db/schema';
import { type AddCommentInput } from '../schema';
import { addComment } from '../handlers/add_comment';
import { eq } from 'drizzle-orm';

// Test data
const testUser = {
  username: 'testuser',
  email: 'test@example.com',
  password_hash: 'hashedpassword',
  full_name: 'Test User',
  role: 'STAFF' as const
};

const testReport = {
  title: 'Test Report',
  activity_date: new Date('2024-01-15'),
  start_time: '09:00',
  end_time: '17:00',
  description: 'Test report description',
  location: 'Test Location',
  participants: 'Test participants',
  status: 'DRAFT' as const
};

const testCommentInput: AddCommentInput = {
  report_id: 1, // Will be updated after report creation
  comment: 'This is a test comment on the report'
};

describe('addComment', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should add a comment to a report', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create prerequisite report
    const reportResult = await db.insert(reportsTable)
      .values({
        ...testReport,
        created_by: userId
      })
      .returning()
      .execute();
    const reportId = reportResult[0].id;

    // Update test input with actual report ID
    const input = { ...testCommentInput, report_id: reportId };

    const result = await addComment(input, userId);

    // Verify comment properties
    expect(result.id).toBeDefined();
    expect(result.report_id).toEqual(reportId);
    expect(result.user_id).toEqual(userId);
    expect(result.comment).toEqual('This is a test comment on the report');
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save comment to database', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create prerequisite report
    const reportResult = await db.insert(reportsTable)
      .values({
        ...testReport,
        created_by: userId
      })
      .returning()
      .execute();
    const reportId = reportResult[0].id;

    // Update test input with actual report ID
    const input = { ...testCommentInput, report_id: reportId };

    const result = await addComment(input, userId);

    // Query database to verify comment was saved
    const comments = await db.select()
      .from(reportCommentsTable)
      .where(eq(reportCommentsTable.id, result.id))
      .execute();

    expect(comments).toHaveLength(1);
    expect(comments[0].report_id).toEqual(reportId);
    expect(comments[0].user_id).toEqual(userId);
    expect(comments[0].comment).toEqual('This is a test comment on the report');
    expect(comments[0].created_at).toBeInstanceOf(Date);
  });

  it('should allow different users to comment on the same report', async () => {
    // Create first user
    const user1Result = await db.insert(usersTable)
      .values({
        ...testUser,
        username: 'user1',
        email: 'user1@example.com'
      })
      .returning()
      .execute();
    const user1Id = user1Result[0].id;

    // Create second user
    const user2Result = await db.insert(usersTable)
      .values({
        ...testUser,
        username: 'user2',
        email: 'user2@example.com'
      })
      .returning()
      .execute();
    const user2Id = user2Result[0].id;

    // Create report
    const reportResult = await db.insert(reportsTable)
      .values({
        ...testReport,
        created_by: user1Id
      })
      .returning()
      .execute();
    const reportId = reportResult[0].id;

    // Add comment from first user
    const comment1 = await addComment({
      report_id: reportId,
      comment: 'Comment from user 1'
    }, user1Id);

    // Add comment from second user
    const comment2 = await addComment({
      report_id: reportId,
      comment: 'Comment from user 2'
    }, user2Id);

    expect(comment1.user_id).toEqual(user1Id);
    expect(comment1.comment).toEqual('Comment from user 1');
    expect(comment2.user_id).toEqual(user2Id);
    expect(comment2.comment).toEqual('Comment from user 2');

    // Verify both comments exist in database
    const allComments = await db.select()
      .from(reportCommentsTable)
      .where(eq(reportCommentsTable.report_id, reportId))
      .execute();

    expect(allComments).toHaveLength(2);
  });

  it('should throw error when report does not exist', async () => {
    // Create user for comment
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    const input = {
      report_id: 99999, // Non-existent report ID
      comment: 'Comment on non-existent report'
    };

    await expect(addComment(input, userId)).rejects.toThrow(/report not found/i);
  });

  it('should handle long comments correctly', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create prerequisite report
    const reportResult = await db.insert(reportsTable)
      .values({
        ...testReport,
        created_by: userId
      })
      .returning()
      .execute();
    const reportId = reportResult[0].id;

    const longComment = 'This is a very long comment '.repeat(20) + 'with detailed feedback about the report.';
    
    const input = {
      report_id: reportId,
      comment: longComment
    };

    const result = await addComment(input, userId);

    expect(result.comment).toEqual(longComment);
    expect(result.comment.length).toBeGreaterThan(500);
  });
});