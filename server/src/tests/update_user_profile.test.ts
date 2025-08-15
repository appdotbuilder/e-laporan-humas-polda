import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UpdateUserProfileInput, type RegisterUserInput } from '../schema';
import { updateUserProfile } from '../handlers/update_user_profile';
import { eq } from 'drizzle-orm';

// Helper function to create a test user
async function createTestUser(userData: RegisterUserInput) {
  const passwordHash = await Bun.password.hash(userData.password);
  
  const result = await db.insert(usersTable)
    .values({
      username: userData.username,
      email: userData.email,
      password_hash: passwordHash,
      full_name: userData.full_name,
      role: userData.role
    })
    .returning()
    .execute();

  return result[0];
}

const testUserData: RegisterUserInput = {
  username: 'testuser',
  email: 'test@example.com',
  password: 'password123',
  full_name: 'Test User',
  role: 'STAFF'
};

describe('updateUserProfile', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update email only', async () => {
    // Create test user first
    const user = await createTestUser(testUserData);

    const updateInput: UpdateUserProfileInput = {
      id: user.id,
      email: 'newemail@example.com'
    };

    const result = await updateUserProfile(updateInput);

    // Verify updated fields
    expect(result.email).toEqual('newemail@example.com');
    expect(result.full_name).toEqual(testUserData.full_name); // Should remain unchanged
    expect(result.username).toEqual(testUserData.username); // Should remain unchanged
    expect(result.role).toEqual(testUserData.role); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > result.created_at).toBe(true);
  });

  it('should update full_name only', async () => {
    const user = await createTestUser(testUserData);

    const updateInput: UpdateUserProfileInput = {
      id: user.id,
      full_name: 'Updated Full Name'
    };

    const result = await updateUserProfile(updateInput);

    expect(result.full_name).toEqual('Updated Full Name');
    expect(result.email).toEqual(testUserData.email); // Should remain unchanged
    expect(result.username).toEqual(testUserData.username);
    expect(result.role).toEqual(testUserData.role);
  });

  it('should update password and hash it correctly', async () => {
    const user = await createTestUser(testUserData);
    const originalPasswordHash = user.password_hash;

    const updateInput: UpdateUserProfileInput = {
      id: user.id,
      password: 'newpassword456'
    };

    const result = await updateUserProfile(updateInput);

    // Password hash should have changed
    expect(result.password_hash).not.toEqual(originalPasswordHash);
    
    // Verify the new password can be verified
    const isPasswordValid = await Bun.password.verify('newpassword456', result.password_hash);
    expect(isPasswordValid).toBe(true);

    // Verify old password no longer works
    const isOldPasswordValid = await Bun.password.verify('password123', result.password_hash);
    expect(isOldPasswordValid).toBe(false);
  });

  it('should update all fields together', async () => {
    const user = await createTestUser(testUserData);

    const updateInput: UpdateUserProfileInput = {
      id: user.id,
      email: 'allupdated@example.com',
      full_name: 'All Updated Name',
      password: 'completelynewpass'
    };

    const result = await updateUserProfile(updateInput);

    expect(result.email).toEqual('allupdated@example.com');
    expect(result.full_name).toEqual('All Updated Name');
    
    // Verify new password works
    const isPasswordValid = await Bun.password.verify('completelynewpass', result.password_hash);
    expect(isPasswordValid).toBe(true);
    
    expect(result.username).toEqual(testUserData.username); // Should remain unchanged
    expect(result.role).toEqual(testUserData.role); // Should remain unchanged
  });

  it('should save changes to database', async () => {
    const user = await createTestUser(testUserData);

    const updateInput: UpdateUserProfileInput = {
      id: user.id,
      email: 'database@example.com',
      full_name: 'Database Test'
    };

    await updateUserProfile(updateInput);

    // Query database directly to verify changes were persisted
    const updatedUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, user.id))
      .execute();

    expect(updatedUsers).toHaveLength(1);
    const updatedUser = updatedUsers[0];
    
    expect(updatedUser.email).toEqual('database@example.com');
    expect(updatedUser.full_name).toEqual('Database Test');
    expect(updatedUser.updated_at).toBeInstanceOf(Date);
    expect(updatedUser.updated_at > updatedUser.created_at).toBe(true);
  });

  it('should update updated_at timestamp', async () => {
    const user = await createTestUser(testUserData);
    const originalUpdatedAt = user.updated_at;

    // Wait a small amount to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const updateInput: UpdateUserProfileInput = {
      id: user.id,
      email: 'timestamp@example.com'
    };

    const result = await updateUserProfile(updateInput);

    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > originalUpdatedAt).toBe(true);
  });

  it('should throw error for non-existent user', async () => {
    const updateInput: UpdateUserProfileInput = {
      id: 99999, // Non-existent user ID
      email: 'nonexistent@example.com'
    };

    await expect(updateUserProfile(updateInput)).rejects.toThrow(/User with id 99999 not found/i);
  });

  it('should handle empty update gracefully', async () => {
    const user = await createTestUser(testUserData);

    const updateInput: UpdateUserProfileInput = {
      id: user.id
      // No fields to update
    };

    const result = await updateUserProfile(updateInput);

    // Should still update the updated_at timestamp
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > result.created_at).toBe(true);
    
    // Other fields should remain unchanged
    expect(result.email).toEqual(testUserData.email);
    expect(result.full_name).toEqual(testUserData.full_name);
    expect(result.username).toEqual(testUserData.username);
  });

  it('should handle password hashing for different password lengths', async () => {
    const user = await createTestUser(testUserData);

    const shortPassword = 'short1';
    const longPassword = 'this_is_a_very_long_password_with_many_characters_123456789';

    // Test short password
    const shortUpdateInput: UpdateUserProfileInput = {
      id: user.id,
      password: shortPassword
    };

    const shortResult = await updateUserProfile(shortUpdateInput);
    const isShortPasswordValid = await Bun.password.verify(shortPassword, shortResult.password_hash);
    expect(isShortPasswordValid).toBe(true);

    // Test long password  
    const longUpdateInput: UpdateUserProfileInput = {
      id: user.id,
      password: longPassword
    };

    const longResult = await updateUserProfile(longUpdateInput);
    const isLongPasswordValid = await Bun.password.verify(longPassword, longResult.password_hash);
    expect(isLongPasswordValid).toBe(true);

    // Verify passwords are different hashes
    expect(shortResult.password_hash).not.toEqual(longResult.password_hash);
  });
});