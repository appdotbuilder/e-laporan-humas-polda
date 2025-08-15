import { db } from '../db';
import { usersTable } from '../db/schema';
import { type RegisterUserInput, type User } from '../schema';

export const registerUser = async (input: RegisterUserInput): Promise<User> => {
  try {
    // Hash the password using Bun's built-in password hashing
    const password_hash = await Bun.password.hash(input.password);

    // Insert user record
    const result = await db.insert(usersTable)
      .values({
        username: input.username,
        email: input.email,
        password_hash: password_hash,
        full_name: input.full_name,
        role: input.role
      })
      .returning()
      .execute();

    // Return the created user
    const user = result[0];
    return {
      ...user
    };
  } catch (error) {
    console.error('User registration failed:', error);
    throw error;
  }
};