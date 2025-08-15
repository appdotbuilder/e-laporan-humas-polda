import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput, type User } from '../schema';
import { loginUser } from '../handlers/login_user';

// Test user data
const testUser = {
  username: 'testuser',
  email: 'test@example.com',
  password_hash: 'testpassword123', // In real app, this would be bcrypt hash
  full_name: 'Test User',
  role: 'STAFF' as const
};

const loginInput: LoginInput = {
  username: 'testuser',
  password: 'testpassword123'
};

const invalidLoginInput: LoginInput = {
  username: 'testuser',
  password: 'wrongpassword'
};

const nonexistentUserInput: LoginInput = {
  username: 'nonexistent',
  password: 'anypassword'
};

describe('loginUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return user data for valid credentials', async () => {
    // Create test user first
    const insertedUsers = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const createdUser = insertedUsers[0];

    // Attempt login with valid credentials
    const result = await loginUser(loginInput);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(createdUser.id);
    expect(result!.username).toBe('testuser');
    expect(result!.email).toBe('test@example.com');
    expect(result!.full_name).toBe('Test User');
    expect(result!.role).toBe('STAFF');
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null for invalid password', async () => {
    // Create test user first
    await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    // Attempt login with wrong password
    const result = await loginUser(invalidLoginInput);

    expect(result).toBeNull();
  });

  it('should return null for nonexistent user', async () => {
    // Attempt login with nonexistent username
    const result = await loginUser(nonexistentUserInput);

    expect(result).toBeNull();
  });

  it('should authenticate different user roles correctly', async () => {
    // Create users with different roles
    const adminUser = {
      ...testUser,
      username: 'admin',
      email: 'admin@example.com',
      role: 'ADMIN' as const
    };

    const pimpinanUser = {
      ...testUser,
      username: 'pimpinan',
      email: 'pimpinan@example.com',
      role: 'PIMPINAN' as const
    };

    // Insert both users
    await db.insert(usersTable)
      .values([adminUser, pimpinanUser])
      .execute();

    // Test admin login
    const adminResult = await loginUser({
      username: 'admin',
      password: 'testpassword123'
    });

    expect(adminResult).not.toBeNull();
    expect(adminResult!.role).toBe('ADMIN');
    expect(adminResult!.username).toBe('admin');

    // Test pimpinan login
    const pimpinanResult = await loginUser({
      username: 'pimpinan',
      password: 'testpassword123'
    });

    expect(pimpinanResult).not.toBeNull();
    expect(pimpinanResult!.role).toBe('PIMPINAN');
    expect(pimpinanResult!.username).toBe('pimpinan');
  });

  it('should be case sensitive for usernames', async () => {
    // Create test user
    await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    // Try login with different case username
    const result = await loginUser({
      username: 'TestUser', // Different case
      password: 'testpassword123'
    });

    expect(result).toBeNull();
  });

  it('should handle empty username gracefully', async () => {
    const result = await loginUser({
      username: '',
      password: 'testpassword123'
    });

    expect(result).toBeNull();
  });

  it('should handle empty password gracefully', async () => {
    // Create test user
    await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const result = await loginUser({
      username: 'testuser',
      password: ''
    });

    expect(result).toBeNull();
  });
});