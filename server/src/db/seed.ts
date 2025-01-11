import { SITE_ADMIN_IDS } from '../env.js';
import { connection, db, sessions, users } from './schema.js';

async function seed() {
  console.log('Seeding the database...');

  // Clean existing data
  // console.log('Cleaning existing data...');
  // await db.delete(users);
  // await db.delete(sessions);

  console.log('Inserting seed data...');

  for (const id of SITE_ADMIN_IDS.split(',')) {
    await db
      .insert(users)
      .values({
        id: id,
        isAdmin: true,
        refreshToken: '',
        accessToken: '',
        accessTokenExpiration: new Date()
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          isAdmin: true
        }
      });
  }

  console.log('Seeding completed successfully.');
}

seed()
  .catch((e) => {
    console.error('Seeding failed:');
    console.error(e);
  })
  .finally(() => {
    connection.close();
  });
