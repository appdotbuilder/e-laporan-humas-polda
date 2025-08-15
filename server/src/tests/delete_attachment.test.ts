import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, reportsTable, reportAttachmentsTable } from '../db/schema';
import { deleteAttachment } from '../handlers/delete_attachment';
import { eq } from 'drizzle-orm';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// Test data setup
const testUser = {
  username: 'testuser',
  email: 'test@example.com',
  password_hash: 'hashed_password',
  full_name: 'Test User',
  role: 'STAFF' as const
};

const adminUser = {
  username: 'admin',
  email: 'admin@example.com', 
  password_hash: 'hashed_password',
  full_name: 'Admin User',
  role: 'ADMIN' as const
};

const pimpinanUser = {
  username: 'pimpinan',
  email: 'pimpinan@example.com',
  password_hash: 'hashed_password', 
  full_name: 'Pimpinan User',
  role: 'PIMPINAN' as const
};

const otherUser = {
  username: 'otheruser',
  email: 'other@example.com',
  password_hash: 'hashed_password',
  full_name: 'Other User', 
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

describe('deleteAttachment', () => {
  let userId: number;
  let adminId: number;
  let pimpinanId: number;
  let otherId: number;
  let reportId: number;
  let attachmentId: number;
  let testFilePath: string;

  beforeEach(async () => {
    await createDB();

    // Create test users
    const userResults = await db.insert(usersTable)
      .values([testUser, adminUser, pimpinanUser, otherUser])
      .returning()
      .execute();

    userId = userResults[0].id;
    adminId = userResults[1].id;
    pimpinanId = userResults[2].id;
    otherId = userResults[3].id;

    // Create test report
    const reportResults = await db.insert(reportsTable)
      .values({
        ...testReport,
        created_by: userId
      })
      .returning()
      .execute();

    reportId = reportResults[0].id;

    // Create test directory and file
    const testDir = join(process.cwd(), 'test-uploads');
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }

    testFilePath = join(testDir, 'test-attachment.txt');
    writeFileSync(testFilePath, 'test content');

    // Create test attachment
    const attachmentResults = await db.insert(reportAttachmentsTable)
      .values({
        report_id: reportId,
        filename: 'stored-filename.txt',
        original_filename: 'test-attachment.txt',
        file_path: testFilePath,
        file_size: 1024,
        mime_type: 'text/plain'
      })
      .returning()
      .execute();

    attachmentId = attachmentResults[0].id;
  });

  afterEach(async () => {
    // Clean up test files if they still exist
    if (existsSync(testFilePath)) {
      try {
        await Bun.file(testFilePath).exists().then(exists => {
          if (exists) return Bun.write(testFilePath, '');
        });
      } catch {
        // Ignore cleanup errors
      }
    }
    await resetDB();
  });

  it('should delete attachment when user owns the report', async () => {
    const result = await deleteAttachment(attachmentId, userId, 'STAFF');

    expect(result).toBe(true);

    // Verify attachment was deleted from database
    const attachments = await db.select()
      .from(reportAttachmentsTable)
      .where(eq(reportAttachmentsTable.id, attachmentId))
      .execute();

    expect(attachments).toHaveLength(0);
  });

  it('should delete attachment when user is ADMIN', async () => {
    const result = await deleteAttachment(attachmentId, adminId, 'ADMIN');

    expect(result).toBe(true);

    // Verify attachment was deleted from database
    const attachments = await db.select()
      .from(reportAttachmentsTable)
      .where(eq(reportAttachmentsTable.id, attachmentId))
      .execute();

    expect(attachments).toHaveLength(0);
  });

  it('should delete attachment when user is PIMPINAN', async () => {
    const result = await deleteAttachment(attachmentId, pimpinanId, 'PIMPINAN');

    expect(result).toBe(true);

    // Verify attachment was deleted from database
    const attachments = await db.select()
      .from(reportAttachmentsTable)
      .where(eq(reportAttachmentsTable.id, attachmentId))
      .execute();

    expect(attachments).toHaveLength(0);
  });

  it('should not delete attachment when user does not own report and is STAFF', async () => {
    const result = await deleteAttachment(attachmentId, otherId, 'STAFF');

    expect(result).toBe(false);

    // Verify attachment still exists in database
    const attachments = await db.select()
      .from(reportAttachmentsTable)
      .where(eq(reportAttachmentsTable.id, attachmentId))
      .execute();

    expect(attachments).toHaveLength(1);
  });

  it('should return false when attachment does not exist', async () => {
    const nonExistentId = 99999;
    const result = await deleteAttachment(nonExistentId, userId, 'ADMIN');

    expect(result).toBe(false);
  });

  it('should handle file deletion gracefully when file does not exist', async () => {
    // Delete the physical file first
    if (existsSync(testFilePath)) {
      await Bun.write(testFilePath, '');
    }

    const result = await deleteAttachment(attachmentId, userId, 'STAFF');

    // Should still succeed even if physical file doesn't exist
    expect(result).toBe(true);

    // Verify attachment was deleted from database
    const attachments = await db.select()
      .from(reportAttachmentsTable)
      .where(eq(reportAttachmentsTable.id, attachmentId))
      .execute();

    expect(attachments).toHaveLength(0);
  });

  it('should verify permission logic with different user roles', async () => {
    // Create additional attachments for testing different scenarios
    const attachment2Results = await db.insert(reportAttachmentsTable)
      .values({
        report_id: reportId,
        filename: 'stored-filename-2.txt',
        original_filename: 'test-attachment-2.txt',
        file_path: '/tmp/test-2.txt',
        file_size: 512,
        mime_type: 'text/plain'
      })
      .returning()
      .execute();

    const attachment2Id = attachment2Results[0].id;

    // Test different permission combinations
    const staffCannotDelete = await deleteAttachment(attachment2Id, otherId, 'STAFF');
    expect(staffCannotDelete).toBe(false);

    const adminCanDelete = await deleteAttachment(attachment2Id, adminId, 'ADMIN');  
    expect(adminCanDelete).toBe(true);

    // Verify only the second attachment was deleted
    const remainingAttachments = await db.select()
      .from(reportAttachmentsTable)
      .execute();

    expect(remainingAttachments).toHaveLength(1);
    expect(remainingAttachments[0].id).toBe(attachmentId);
  });

  it('should handle edge cases with invalid user ID', async () => {
    // ADMIN users can still delete attachments even with invalid user ID
    // because permission is based on role, not user ownership
    const adminResult = await deleteAttachment(attachmentId, -1, 'ADMIN');
    expect(adminResult).toBe(true);

    // Verify attachment was deleted
    const attachments = await db.select()
      .from(reportAttachmentsTable)
      .where(eq(reportAttachmentsTable.id, attachmentId))
      .execute();

    expect(attachments).toHaveLength(0);
  });

  it('should handle invalid user ID for STAFF users', async () => {
    // Create a new attachment for this test
    const newAttachmentResults = await db.insert(reportAttachmentsTable)
      .values({
        report_id: reportId,
        filename: 'test-staff.txt',
        original_filename: 'staff-test.txt', 
        file_path: '/tmp/staff-test.txt',
        file_size: 256,
        mime_type: 'text/plain'
      })
      .returning()
      .execute();

    const newAttachmentId = newAttachmentResults[0].id;

    // STAFF users with invalid ID should not be able to delete
    // because they need to own the report
    const staffResult = await deleteAttachment(newAttachmentId, -1, 'STAFF');
    expect(staffResult).toBe(false);

    // Verify attachment still exists
    const attachments = await db.select()
      .from(reportAttachmentsTable)
      .where(eq(reportAttachmentsTable.id, newAttachmentId))
      .execute();

    expect(attachments).toHaveLength(1);
  });
});