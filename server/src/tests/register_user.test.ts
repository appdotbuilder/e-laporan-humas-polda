import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type RegisterUserInput } from '../schema';
import { registerUser } from '../handlers/register_user';
import { eq } from 'drizzle-orm';

// Test input with all required fields
const testInput: RegisterUserInput = {
  username: 'testuser',
  email: 'test@example.com',
  password: 'password123',
  full_name: 'Test User',
  role: 'STAFF'
};

describe('registerUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should register a new user with valid input', async () => {
    const result = await registerUser(testInput);

    // Basic field validation
    expect(result.username).toEqual('testuser');
    expect(result.email).toEqual('test@example.com');
    expect(result.full_name).toEqual('Test User');
    expect(result.role).toEqual('STAFF');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    
    // Password should be hashed, not plain text
    expect(result.password_hash).toBeDefined();
    expect(result.password_hash).not.toEqual('password123');
    expect(result.password_hash.length).toBeGreaterThan(50); // Hashed passwords are long
  });

  it('should save user to database correctly', async () => {
    const result = await registerUser(testInput);

    // Query using proper drizzle syntax
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].username).toEqual('testuser');
    expect(users[0].email).toEqual('test@example.com');
    expect(users[0].full_name).toEqual('Test User');
    expect(users[0].role).toEqual('STAFF');
    expect(users[0].created_at).toBeInstanceOf(Date);
    expect(users[0].updated_at).toBeInstanceOf(Date);
  });

  it('should hash password properly', async () => {
    const result = await registerUser(testInput);

    // Verify password hash using Bun's password verification
    const isValid = await Bun.password.verify('password123', result.password_hash);
    expect(isValid).toBe(true);

    // Verify wrong password fails
    const isInvalid = await Bun.password.verify('wrongpassword', result.password_hash);
    expect(isInvalid).toBe(false);
  });

  it('should create user with PIMPINAN role', async () => {
    const pimpinanInput: RegisterUserInput = {
      ...testInput,
      username: 'pimpinan',
      email: 'pimpinan@example.com',
      role: 'PIMPINAN'
    };

    const result = await registerUser(pimpinanInput);

    expect(result.role).toEqual('PIMPINAN');
    expect(result.username).toEqual('pimpinan');
  });

  it('should create user with ADMIN role', async () => {
    const adminInput: RegisterUserInput = {
      ...testInput,
      username: 'admin',
      email: 'admin@example.com',
      role: 'ADMIN'
    };

    const result = await registerUser(adminInput);

    expect(result.role).toEqual('ADMIN');
    expect(result.username).toEqual('admin');
  });

  it('should handle unique constraint violation for username', async () => {
    // Create first user
    await registerUser(testInput);

    // Try to create another user with same username
    const duplicateInput: RegisterUserInput = {
      ...testInput,
      email: 'different@example.com'
    };

    await expect(registerUser(duplicateInput)).rejects.toThrow();
  });

  it('should handle unique constraint violation for email', async () => {
    // Create first user
    await registerUser(testInput);

    // Try to create another user with same email
    const duplicateInput: RegisterUserInput = {
      ...testInput,
      username: 'different'
    };

    await expect(registerUser(duplicateInput)).rejects.toThrow();
  });

  it('should handle long usernames and full names', async () => {
    const longNameInput: RegisterUserInput = {
      username: 'a'.repeat(50), // Maximum allowed length
      email: 'longname@example.com',
      password: 'password123',
      full_name: 'A'.repeat(100), // Maximum allowed length
      role: 'STAFF'
    };

    const result = await registerUser(longNameInput);

    expect(result.username).toEqual('a'.repeat(50));
    expect(result.full_name).toEqual('A'.repeat(100));
  });

  it('should set timestamps correctly', async () => {
    const beforeRegistration = new Date();
    
    const result = await registerUser(testInput);
    
    const afterRegistration = new Date();

    // Timestamps should be set to current time
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.created_at.getTime()).toBeGreaterThanOrEqual(beforeRegistration.getTime());
    expect(result.created_at.getTime()).toBeLessThanOrEqual(afterRegistration.getTime());
    expect(result.updated_at.getTime()).toBeGreaterThanOrEqual(beforeRegistration.getTime());
    expect(result.updated_at.getTime()).toBeLessThanOrEqual(afterRegistration.getTime());
  });
});