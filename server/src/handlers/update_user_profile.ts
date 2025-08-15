import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UpdateUserProfileInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export const updateUserProfile = async (input: UpdateUserProfileInput): Promise<User> => {
  try {
    // First check if user exists
    const existingUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.id))
      .execute();

    if (existingUsers.length === 0) {
      throw new Error(`User with id ${input.id} not found`);
    }

    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.email !== undefined) {
      updateData.email = input.email;
    }

    if (input.full_name !== undefined) {
      updateData.full_name = input.full_name;
    }

    if (input.password !== undefined) {
      // Hash the password before storing
      const passwordHash = await Bun.password.hash(input.password);
      updateData.password_hash = passwordHash;
    }

    // Update the user record
    const result = await db.update(usersTable)
      .set(updateData)
      .where(eq(usersTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('User profile update failed:', error);
    throw error;
  }
};