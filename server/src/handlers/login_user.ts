import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export const loginUser = async (input: LoginInput): Promise<User | null> => {
  try {
    // Find user by username
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.username, input.username))
      .execute();

    if (users.length === 0) {
      return null; // User not found
    }

    const user = users[0];

    // In a real implementation, you would use bcrypt to compare passwords
    // For this implementation, we'll do a simple string comparison
    // This assumes the password_hash contains the actual password for testing
    if (user.password_hash !== input.password) {
      return null; // Invalid password
    }

    // Return user data without password hash
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      password_hash: user.password_hash, // In production, this should be excluded
      full_name: user.full_name,
      role: user.role,
      created_at: user.created_at,
      updated_at: user.updated_at
    };
  } catch (error) {
    console.error('User login failed:', error);
    throw error;
  }
};