import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { getUsers } from '../handlers/get_users';
import { type User } from '../schema';

const createTestUser = async (userData: Partial<User>) => {
  const result = await db.insert(usersTable)
    .values({
      username: userData.username || 'testuser',
      email: userData.email || 'test@example.com',
      password_hash: userData.password_hash || 'hashedpassword',
      full_name: userData.full_name || 'Test User',
      role: userData.role || 'STAFF',
    })
    .returning()
    .execute();
  
  return result[0];
};

describe('getUsers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no users exist', async () => {
    const result = await getUsers();
    
    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it('should return all users when users exist', async () => {
    // Create test users
    const user1 = await createTestUser({
      username: 'alice',
      email: 'alice@example.com',
      full_name: 'Alice Johnson',
      role: 'STAFF'
    });

    const user2 = await createTestUser({
      username: 'bob',
      email: 'bob@example.com', 
      full_name: 'Bob Smith',
      role: 'PIMPINAN'
    });

    const user3 = await createTestUser({
      username: 'charlie',
      email: 'charlie@example.com',
      full_name: 'Charlie Brown',
      role: 'ADMIN'
    });

    const result = await getUsers();

    expect(result).toHaveLength(3);
    
    // Should be ordered by username (alice, bob, charlie)
    expect(result[0].username).toBe('alice');
    expect(result[1].username).toBe('bob');
    expect(result[2].username).toBe('charlie');

    // Verify all user properties are returned
    expect(result[0]).toMatchObject({
      id: user1.id,
      username: 'alice',
      email: 'alice@example.com',
      password_hash: 'hashedpassword',
      full_name: 'Alice Johnson',
      role: 'STAFF'
    });

    expect(result[1]).toMatchObject({
      id: user2.id,
      username: 'bob',
      email: 'bob@example.com',
      password_hash: 'hashedpassword', 
      full_name: 'Bob Smith',
      role: 'PIMPINAN'
    });

    expect(result[2]).toMatchObject({
      id: user3.id,
      username: 'charlie',
      email: 'charlie@example.com',
      password_hash: 'hashedpassword',
      full_name: 'Charlie Brown', 
      role: 'ADMIN'
    });

    // Verify date fields are present and correct types
    result.forEach(user => {
      expect(user.created_at).toBeInstanceOf(Date);
      expect(user.updated_at).toBeInstanceOf(Date);
      expect(user.id).toBeTypeOf('number');
    });
  });

  it('should return users with all roles', async () => {
    // Create one user of each role type
    await createTestUser({
      username: 'staff_user',
      email: 'staff@example.com',
      role: 'STAFF'
    });

    await createTestUser({
      username: 'pimpinan_user', 
      email: 'pimpinan@example.com',
      role: 'PIMPINAN'
    });

    await createTestUser({
      username: 'admin_user',
      email: 'admin@example.com', 
      role: 'ADMIN'
    });

    const result = await getUsers();

    expect(result).toHaveLength(3);

    const roles = result.map(user => user.role);
    expect(roles).toContain('STAFF');
    expect(roles).toContain('PIMPINAN');
    expect(roles).toContain('ADMIN');
  });

  it('should maintain consistent ordering', async () => {
    // Create users in random order with unique emails
    await createTestUser({ 
      username: 'zebra',
      email: 'zebra@example.com'
    });
    await createTestUser({ 
      username: 'alpha',
      email: 'alpha@example.com'
    });
    await createTestUser({ 
      username: 'beta',
      email: 'beta@example.com'
    });

    const result1 = await getUsers();
    const result2 = await getUsers();

    // Results should be consistently ordered by username
    expect(result1.map(u => u.username)).toEqual(['alpha', 'beta', 'zebra']);
    expect(result2.map(u => u.username)).toEqual(['alpha', 'beta', 'zebra']);
  });

  it('should handle users with special characters in names', async () => {
    await createTestUser({
      username: 'user.with-special_chars',
      email: 'special@example.com',
      full_name: "User with 'Special' Characters & Symbols",
    });

    const result = await getUsers();

    expect(result).toHaveLength(1);
    expect(result[0].username).toBe('user.with-special_chars');
    expect(result[0].full_name).toBe("User with 'Special' Characters & Symbols");
  });
});