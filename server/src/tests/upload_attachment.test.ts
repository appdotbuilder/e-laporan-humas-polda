import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, reportsTable, reportAttachmentsTable } from '../db/schema';
import { type UploadAttachmentInput } from '../schema';
import { uploadAttachment } from '../handlers/upload_attachment';
import { eq } from 'drizzle-orm';

// Test data
const testUser = {
  username: 'testuser',
  email: 'test@example.com',
  password_hash: 'hashedpassword123',
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
  status: 'DRAFT' as const,
  created_by: 1 // Will be set to actual user ID
};

const testAttachmentInput: UploadAttachmentInput = {
  report_id: 1, // Will be set to actual report ID
  filename: 'test-document.pdf',
  original_filename: 'Test Document.pdf',
  file_path: '/uploads/attachments/test-document.pdf',
  file_size: 1024000,
  mime_type: 'application/pdf'
};

describe('uploadAttachment', () => {
  let userId: number;
  let reportId: number;
  let otherUserId: number;

  beforeEach(async () => {
    await createDB();

    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    userId = userResult[0].id;

    // Create another user for permission tests
    const otherUserResult = await db.insert(usersTable)
      .values({
        ...testUser,
        username: 'otheruser',
        email: 'other@example.com'
      })
      .returning()
      .execute();
    otherUserId = otherUserResult[0].id;

    // Create test report
    const reportResult = await db.insert(reportsTable)
      .values({
        ...testReport,
        created_by: userId
      })
      .returning()
      .execute();
    reportId = reportResult[0].id;

    // Update test input with actual IDs
    testAttachmentInput.report_id = reportId;
  });

  afterEach(resetDB);

  it('should upload attachment successfully', async () => {
    const result = await uploadAttachment(testAttachmentInput, userId);

    // Verify returned attachment data
    expect(result.report_id).toEqual(reportId);
    expect(result.filename).toEqual('test-document.pdf');
    expect(result.original_filename).toEqual('Test Document.pdf');
    expect(result.file_path).toEqual('/uploads/attachments/test-document.pdf');
    expect(result.file_size).toEqual(1024000);
    expect(result.mime_type).toEqual('application/pdf');
    expect(result.id).toBeDefined();
    expect(result.uploaded_at).toBeInstanceOf(Date);
  });

  it('should save attachment to database', async () => {
    const result = await uploadAttachment(testAttachmentInput, userId);

    // Query attachment from database
    const attachments = await db.select()
      .from(reportAttachmentsTable)
      .where(eq(reportAttachmentsTable.id, result.id))
      .execute();

    expect(attachments).toHaveLength(1);
    expect(attachments[0].report_id).toEqual(reportId);
    expect(attachments[0].filename).toEqual('test-document.pdf');
    expect(attachments[0].original_filename).toEqual('Test Document.pdf');
    expect(attachments[0].file_path).toEqual('/uploads/attachments/test-document.pdf');
    expect(attachments[0].file_size).toEqual(1024000);
    expect(attachments[0].mime_type).toEqual('application/pdf');
    expect(attachments[0].uploaded_at).toBeInstanceOf(Date);
  });

  it('should allow multiple attachments for same report', async () => {
    const firstAttachment = await uploadAttachment(testAttachmentInput, userId);

    const secondAttachmentInput = {
      ...testAttachmentInput,
      filename: 'second-document.jpg',
      original_filename: 'Second Document.jpg',
      file_path: '/uploads/attachments/second-document.jpg',
      file_size: 512000,
      mime_type: 'image/jpeg'
    };

    const secondAttachment = await uploadAttachment(secondAttachmentInput, userId);

    // Verify both attachments exist
    const attachments = await db.select()
      .from(reportAttachmentsTable)
      .where(eq(reportAttachmentsTable.report_id, reportId))
      .execute();

    expect(attachments).toHaveLength(2);
    expect(attachments.map(a => a.id).sort()).toEqual([firstAttachment.id, secondAttachment.id].sort());
  });

  it('should throw error for non-existent report', async () => {
    const invalidInput = {
      ...testAttachmentInput,
      report_id: 99999
    };

    await expect(uploadAttachment(invalidInput, userId))
      .rejects.toThrow(/report not found/i);
  });

  it('should throw error when user does not own the report', async () => {
    await expect(uploadAttachment(testAttachmentInput, otherUserId))
      .rejects.toThrow(/permission denied/i);
  });

  it('should handle different file types correctly', async () => {
    const imageInput = {
      ...testAttachmentInput,
      filename: 'test-image.png',
      original_filename: 'Test Image.png',
      file_path: '/uploads/attachments/test-image.png',
      file_size: 2048000,
      mime_type: 'image/png'
    };

    const result = await uploadAttachment(imageInput, userId);

    expect(result.filename).toEqual('test-image.png');
    expect(result.mime_type).toEqual('image/png');
    expect(result.file_size).toEqual(2048000);
  });

  it('should handle large file sizes', async () => {
    const largeFileInput = {
      ...testAttachmentInput,
      filename: 'large-file.zip',
      original_filename: 'Large File.zip',
      file_path: '/uploads/attachments/large-file.zip',
      file_size: 50000000, // 50MB
      mime_type: 'application/zip'
    };

    const result = await uploadAttachment(largeFileInput, userId);

    expect(result.file_size).toEqual(50000000);
    expect(result.mime_type).toEqual('application/zip');
  });

  it('should preserve original filename with special characters', async () => {
    const specialNameInput = {
      ...testAttachmentInput,
      filename: 'sanitized-filename.pdf',
      original_filename: 'Файл с кириллицей & спецсимволами (2024).pdf',
      file_path: '/uploads/attachments/sanitized-filename.pdf'
    };

    const result = await uploadAttachment(specialNameInput, userId);

    expect(result.filename).toEqual('sanitized-filename.pdf');
    expect(result.original_filename).toEqual('Файл с кириллицей & спецсимволами (2024).pdf');
  });
});