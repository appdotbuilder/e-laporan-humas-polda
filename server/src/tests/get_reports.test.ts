import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, reportsTable } from '../db/schema';
import { type GetReportsInput } from '../schema';
import { getReports } from '../handlers/get_reports';

describe('getReports', () => {
  let staffUser: { id: number };
  let adminUser: { id: number };
  let pimpinanUser: { id: number };
  let testReports: any[];

  beforeEach(async () => {
    await createDB();

    // Create test users
    const users = await db.insert(usersTable).values([
      {
        username: 'staff_user',
        email: 'staff@example.com',
        password_hash: 'hashed_password',
        full_name: 'Staff User',
        role: 'STAFF'
      },
      {
        username: 'admin_user',
        email: 'admin@example.com',
        password_hash: 'hashed_password',
        full_name: 'Admin User',
        role: 'ADMIN'
      },
      {
        username: 'pimpinan_user',
        email: 'pimpinan@example.com',
        password_hash: 'hashed_password',
        full_name: 'Pimpinan User',
        role: 'PIMPINAN'
      }
    ]).returning();

    staffUser = users[0];
    adminUser = users[1];
    pimpinanUser = users[2];

    // Create test reports
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    testReports = await db.insert(reportsTable).values([
      {
        title: 'Staff Report 1',
        activity_date: today,
        start_time: '09:00',
        end_time: '12:00',
        description: 'Meeting with client about project requirements',
        location: 'Office Room A',
        participants: 'John Doe, Jane Smith',
        status: 'DRAFT',
        created_by: staffUser.id
      },
      {
        title: 'Staff Report 2',
        activity_date: yesterday,
        start_time: '14:00',
        end_time: '16:00',
        description: 'Training session on new software',
        location: 'Conference Hall',
        participants: 'Team members',
        status: 'SUBMITTED',
        created_by: staffUser.id
      },
      {
        title: 'Admin Report 1',
        activity_date: tomorrow,
        start_time: '10:00',
        end_time: '11:30',
        description: 'Budget planning meeting',
        location: 'Meeting Room B',
        participants: 'Finance team',
        status: 'APPROVED',
        created_by: adminUser.id
      },
      {
        title: 'Pimpinan Report 1',
        activity_date: today,
        start_time: '08:00',
        end_time: '17:00',
        description: 'Strategic planning workshop',
        location: 'Headquarters',
        participants: 'All department heads',
        status: 'REJECTED',
        created_by: pimpinanUser.id
      }
    ]).returning();
  });

  afterEach(resetDB);

  describe('Role-based access control', () => {
    it('should return only own reports for STAFF users', async () => {
      const input: GetReportsInput = {
        limit: 20,
        offset: 0
      };

      const result = await getReports(input, staffUser.id, 'STAFF');

      expect(result.reports).toHaveLength(2);
      expect(result.total).toBe(2);
      result.reports.forEach(report => {
        expect(report.created_by).toBe(staffUser.id);
      });
    });

    it('should return all reports for ADMIN users', async () => {
      const input: GetReportsInput = {
        limit: 20,
        offset: 0
      };

      const result = await getReports(input, adminUser.id, 'ADMIN');

      expect(result.reports).toHaveLength(4);
      expect(result.total).toBe(4);
    });

    it('should return all reports for PIMPINAN users', async () => {
      const input: GetReportsInput = {
        limit: 20,
        offset: 0
      };

      const result = await getReports(input, pimpinanUser.id, 'PIMPINAN');

      expect(result.reports).toHaveLength(4);
      expect(result.total).toBe(4);
    });
  });

  describe('Status filtering', () => {
    it('should filter reports by status', async () => {
      const input: GetReportsInput = {
        status: 'DRAFT',
        limit: 20,
        offset: 0
      };

      const result = await getReports(input, adminUser.id, 'ADMIN');

      expect(result.reports).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.reports[0].status).toBe('DRAFT');
    });

    it('should respect role restrictions when filtering by status', async () => {
      const input: GetReportsInput = {
        status: 'APPROVED',
        limit: 20,
        offset: 0
      };

      const result = await getReports(input, staffUser.id, 'STAFF');

      expect(result.reports).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('Creator filtering', () => {
    it('should allow ADMIN to filter by created_by', async () => {
      const input: GetReportsInput = {
        created_by: staffUser.id,
        limit: 20,
        offset: 0
      };

      const result = await getReports(input, adminUser.id, 'ADMIN');

      expect(result.reports).toHaveLength(2);
      expect(result.total).toBe(2);
      result.reports.forEach(report => {
        expect(report.created_by).toBe(staffUser.id);
      });
    });

    it('should allow PIMPINAN to filter by created_by', async () => {
      const input: GetReportsInput = {
        created_by: pimpinanUser.id,
        limit: 20,
        offset: 0
      };

      const result = await getReports(input, adminUser.id, 'PIMPINAN');

      expect(result.reports).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.reports[0].created_by).toBe(pimpinanUser.id);
    });

    it('should ignore created_by filter for STAFF users', async () => {
      const input: GetReportsInput = {
        created_by: adminUser.id, // Try to filter for admin reports
        limit: 20,
        offset: 0
      };

      const result = await getReports(input, staffUser.id, 'STAFF');

      // Should still only see own reports, ignoring the created_by filter
      expect(result.reports).toHaveLength(2);
      expect(result.total).toBe(2);
      result.reports.forEach(report => {
        expect(report.created_by).toBe(staffUser.id);
      });
    });
  });

  describe('Date filtering', () => {
    it('should filter by activity_date_from', async () => {
      const today = new Date();
      const input: GetReportsInput = {
        activity_date_from: today,
        limit: 20,
        offset: 0
      };

      const result = await getReports(input, adminUser.id, 'ADMIN');

      expect(result.reports.length).toBeGreaterThan(0);
      result.reports.forEach(report => {
        expect(report.activity_date >= today).toBe(true);
      });
    });

    it('should filter by activity_date_to', async () => {
      const today = new Date();
      const input: GetReportsInput = {
        activity_date_to: today,
        limit: 20,
        offset: 0
      };

      const result = await getReports(input, adminUser.id, 'ADMIN');

      expect(result.reports.length).toBeGreaterThan(0);
      result.reports.forEach(report => {
        expect(report.activity_date <= today).toBe(true);
      });
    });

    it('should filter by date range', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const today = new Date();

      const input: GetReportsInput = {
        activity_date_from: yesterday,
        activity_date_to: today,
        limit: 20,
        offset: 0
      };

      const result = await getReports(input, adminUser.id, 'ADMIN');

      expect(result.reports.length).toBeGreaterThan(0);
      result.reports.forEach(report => {
        expect(report.activity_date >= yesterday).toBe(true);
        expect(report.activity_date <= today).toBe(true);
      });
    });
  });

  describe('Search functionality', () => {
    it('should search in title', async () => {
      const input: GetReportsInput = {
        search: 'Staff Report',
        limit: 20,
        offset: 0
      };

      const result = await getReports(input, adminUser.id, 'ADMIN');

      expect(result.reports).toHaveLength(2);
      expect(result.total).toBe(2);
      result.reports.forEach(report => {
        expect(report.title).toMatch(/Staff Report/i);
      });
    });

    it('should search in description', async () => {
      const input: GetReportsInput = {
        search: 'meeting',
        limit: 20,
        offset: 0
      };

      const result = await getReports(input, adminUser.id, 'ADMIN');

      expect(result.reports.length).toBeGreaterThan(0);
      result.reports.forEach(report => {
        expect(
          report.title.toLowerCase().includes('meeting') ||
          report.description.toLowerCase().includes('meeting') ||
          report.location.toLowerCase().includes('meeting')
        ).toBe(true);
      });
    });

    it('should search in location', async () => {
      const input: GetReportsInput = {
        search: 'office',
        limit: 20,
        offset: 0
      };

      const result = await getReports(input, adminUser.id, 'ADMIN');

      expect(result.reports).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.reports[0].location).toMatch(/office/i);
    });

    it('should be case insensitive', async () => {
      const input: GetReportsInput = {
        search: 'TRAINING',
        limit: 20,
        offset: 0
      };

      const result = await getReports(input, adminUser.id, 'ADMIN');

      expect(result.reports).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.reports[0].description).toMatch(/training/i);
    });
  });

  describe('Pagination', () => {
    it('should respect limit parameter', async () => {
      const input: GetReportsInput = {
        limit: 2,
        offset: 0
      };

      const result = await getReports(input, adminUser.id, 'ADMIN');

      expect(result.reports).toHaveLength(2);
      expect(result.total).toBe(4); // Total should still be 4
    });

    it('should respect offset parameter', async () => {
      const input: GetReportsInput = {
        limit: 20,
        offset: 2
      };

      const result = await getReports(input, adminUser.id, 'ADMIN');

      expect(result.reports).toHaveLength(2);
      expect(result.total).toBe(4);
    });

    it('should handle offset beyond available records', async () => {
      const input: GetReportsInput = {
        limit: 20,
        offset: 10
      };

      const result = await getReports(input, adminUser.id, 'ADMIN');

      expect(result.reports).toHaveLength(0);
      expect(result.total).toBe(4);
    });
  });

  describe('Multiple filters', () => {
    it('should combine status and search filters', async () => {
      const input: GetReportsInput = {
        status: 'SUBMITTED',
        search: 'training',
        limit: 20,
        offset: 0
      };

      const result = await getReports(input, adminUser.id, 'ADMIN');

      expect(result.reports).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.reports[0].status).toBe('SUBMITTED');
      expect(result.reports[0].description).toMatch(/training/i);
    });

    it('should combine creator and date filters for ADMIN', async () => {
      const today = new Date();
      const input: GetReportsInput = {
        created_by: staffUser.id,
        activity_date_to: today,
        limit: 20,
        offset: 0
      };

      const result = await getReports(input, adminUser.id, 'ADMIN');

      expect(result.reports.length).toBeGreaterThan(0);
      result.reports.forEach(report => {
        expect(report.created_by).toBe(staffUser.id);
        expect(report.activity_date <= today).toBe(true);
      });
    });
  });

  describe('Ordering', () => {
    it('should order reports by created_at desc (newest first)', async () => {
      const input: GetReportsInput = {
        limit: 20,
        offset: 0
      };

      const result = await getReports(input, adminUser.id, 'ADMIN');

      expect(result.reports).toHaveLength(4);

      // Check that reports are ordered by created_at descending
      for (let i = 1; i < result.reports.length; i++) {
        expect(result.reports[i-1].created_at >= result.reports[i].created_at).toBe(true);
      }
    });
  });

  describe('Empty results', () => {
    it('should handle no matching results', async () => {
      const input: GetReportsInput = {
        search: 'nonexistent',
        limit: 20,
        offset: 0
      };

      const result = await getReports(input, adminUser.id, 'ADMIN');

      expect(result.reports).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });
});