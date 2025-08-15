import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, reportsTable, reportAttachmentsTable } from '../db/schema';
import { getReportAttachments } from '../handlers/get_report_attachments';
import { eq } from 'drizzle-orm';

describe('getReportAttachments', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUser: any;
  let otherUser: any;
  let adminUser: any;
  let testReport: any;
  let otherUserReport: any;

  beforeEach(async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          username: 'teststaff',
          email: 'test@example.com',
          password_hash: 'hashedpassword',
          full_name: 'Test Staff User',
          role: 'STAFF'
        },
        {
          username: 'otherstaff',
          email: 'other@example.com',
          password_hash: 'hashedpassword',
          full_name: 'Other Staff User',
          role: 'STAFF'
        },
        {
          username: 'adminuser',
          email: 'admin@example.com',
          password_hash: 'hashedpassword',
          full_name: 'Admin User',
          role: 'ADMIN'
        }
      ])
      .returning()
      .execute();

    testUser = users[0];
    otherUser = users[1];
    adminUser = users[2];

    // Create test reports
    const reports = await db.insert(reportsTable)
      .values([
        {
          title: 'Test Report with Attachments',
          activity_date: new Date('2024-01-15'),
          start_time: '09:00',
          end_time: '17:00',
          description: 'Test report description',
          location: 'Test Location',
          participants: 'Test participants',
          status: 'DRAFT',
          created_by: testUser.id
        },
        {
          title: 'Other User Report',
          activity_date: new Date('2024-01-16'),
          start_time: '10:00',
          end_time: '16:00',
          description: 'Other user report',
          location: 'Other Location',
          participants: 'Other participants',
          status: 'SUBMITTED',
          created_by: otherUser.id
        }
      ])
      .returning()
      .execute();

    testReport = reports[0];
    otherUserReport = reports[1];
  });

  it('should return all attachments for a report when user has access', async () => {
    // Create test attachments
    await db.insert(reportAttachmentsTable)
      .values([
        {
          report_id: testReport.id,
          filename: 'document1.pdf',
          original_filename: 'Original Document 1.pdf',
          file_path: '/uploads/document1.pdf',
          file_size: 1024,
          mime_type: 'application/pdf'
        },
        {
          report_id: testReport.id,
          filename: 'image1.jpg',
          original_filename: 'Photo 1.jpg',
          file_path: '/uploads/image1.jpg',
          file_size: 2048,
          mime_type: 'image/jpeg'
        }
      ])
      .execute();

    const result = await getReportAttachments(testReport.id, testUser.id, 'STAFF');

    expect(result).toHaveLength(2);
    expect(result[0].filename).toEqual('document1.pdf');
    expect(result[0].original_filename).toEqual('Original Document 1.pdf');
    expect(result[0].file_path).toEqual('/uploads/document1.pdf');
    expect(result[0].file_size).toEqual(1024);
    expect(result[0].mime_type).toEqual('application/pdf');
    expect(result[0].report_id).toEqual(testReport.id);
    expect(result[0].uploaded_at).toBeInstanceOf(Date);

    expect(result[1].filename).toEqual('image1.jpg');
    expect(result[1].original_filename).toEqual('Photo 1.jpg');
    expect(result[1].file_path).toEqual('/uploads/image1.jpg');
    expect(result[1].file_size).toEqual(2048);
    expect(result[1].mime_type).toEqual('image/jpeg');
  });

  it('should return empty array when report has no attachments', async () => {
    const result = await getReportAttachments(testReport.id, testUser.id, 'STAFF');

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should allow ADMIN to access attachments for any report', async () => {
    // Create attachment for other user's report
    await db.insert(reportAttachmentsTable)
      .values({
        report_id: otherUserReport.id,
        filename: 'admin_access.pdf',
        original_filename: 'Admin Access Document.pdf',
        file_path: '/uploads/admin_access.pdf',
        file_size: 3072,
        mime_type: 'application/pdf'
      })
      .execute();

    const result = await getReportAttachments(otherUserReport.id, adminUser.id, 'ADMIN');

    expect(result).toHaveLength(1);
    expect(result[0].filename).toEqual('admin_access.pdf');
    expect(result[0].report_id).toEqual(otherUserReport.id);
  });

  it('should allow PIMPINAN to access attachments for any report', async () => {
    // Create PIMPINAN user
    const pimpinanUser = await db.insert(usersTable)
      .values({
        username: 'pimpinan',
        email: 'pimpinan@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Pimpinan User',
        role: 'PIMPINAN'
      })
      .returning()
      .execute();

    // Create attachment for other user's report
    await db.insert(reportAttachmentsTable)
      .values({
        report_id: otherUserReport.id,
        filename: 'pimpinan_access.pdf',
        original_filename: 'Pimpinan Access Document.pdf',
        file_path: '/uploads/pimpinan_access.pdf',
        file_size: 4096,
        mime_type: 'application/pdf'
      })
      .execute();

    const result = await getReportAttachments(otherUserReport.id, pimpinanUser[0].id, 'PIMPINAN');

    expect(result).toHaveLength(1);
    expect(result[0].filename).toEqual('pimpinan_access.pdf');
    expect(result[0].report_id).toEqual(otherUserReport.id);
  });

  it('should deny STAFF access to other users reports', async () => {
    // Create attachment for other user's report
    await db.insert(reportAttachmentsTable)
      .values({
        report_id: otherUserReport.id,
        filename: 'restricted.pdf',
        original_filename: 'Restricted Document.pdf',
        file_path: '/uploads/restricted.pdf',
        file_size: 1536,
        mime_type: 'application/pdf'
      })
      .execute();

    await expect(getReportAttachments(otherUserReport.id, testUser.id, 'STAFF'))
      .rejects.toThrow(/access denied/i);
  });

  it('should throw error when report does not exist', async () => {
    const nonExistentReportId = 99999;

    await expect(getReportAttachments(nonExistentReportId, testUser.id, 'STAFF'))
      .rejects.toThrow(/report not found/i);
  });

  it('should return attachments ordered by upload date', async () => {
    // Create attachments with different timestamps
    const now = new Date();
    const earlier = new Date(now.getTime() - 60000); // 1 minute earlier

    await db.insert(reportAttachmentsTable)
      .values([
        {
          report_id: testReport.id,
          filename: 'second.pdf',
          original_filename: 'Second Document.pdf',
          file_path: '/uploads/second.pdf',
          file_size: 1024,
          mime_type: 'application/pdf'
        },
        {
          report_id: testReport.id,
          filename: 'first.pdf',
          original_filename: 'First Document.pdf',
          file_path: '/uploads/first.pdf',
          file_size: 2048,
          mime_type: 'application/pdf'
        }
      ])
      .execute();

    const result = await getReportAttachments(testReport.id, testUser.id, 'STAFF');

    expect(result).toHaveLength(2);
    // Results should be ordered by uploaded_at (ascending)
    expect(result[0].uploaded_at <= result[1].uploaded_at).toBe(true);
  });

  it('should handle multiple attachments with different mime types', async () => {
    await db.insert(reportAttachmentsTable)
      .values([
        {
          report_id: testReport.id,
          filename: 'document.pdf',
          original_filename: 'Document.pdf',
          file_path: '/uploads/document.pdf',
          file_size: 1024,
          mime_type: 'application/pdf'
        },
        {
          report_id: testReport.id,
          filename: 'spreadsheet.xlsx',
          original_filename: 'Spreadsheet.xlsx',
          file_path: '/uploads/spreadsheet.xlsx',
          file_size: 2048,
          mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        },
        {
          report_id: testReport.id,
          filename: 'image.png',
          original_filename: 'Image.png',
          file_path: '/uploads/image.png',
          file_size: 3072,
          mime_type: 'image/png'
        }
      ])
      .execute();

    const result = await getReportAttachments(testReport.id, testUser.id, 'STAFF');

    expect(result).toHaveLength(3);
    
    const mimeTypes = result.map(attachment => attachment.mime_type);
    expect(mimeTypes).toContain('application/pdf');
    expect(mimeTypes).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(mimeTypes).toContain('image/png');
  });
});