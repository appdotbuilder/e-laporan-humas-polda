import { db } from '../db';
import { usersTable } from '../db/schema';
import { type User } from '../schema';
import { asc } from 'drizzle-orm';

export const getUsers = async (): Promise<User[]> => {
  try {
    // Fetch all users ordered by username for consistent results
    const result = await db.select()
      .from(usersTable)
      .orderBy(asc(usersTable.username))
      .execute();

    return result;
  } catch (error) {
    console.error('Get users failed:', error);
    throw error;
  }
};