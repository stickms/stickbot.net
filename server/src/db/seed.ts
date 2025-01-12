import { SITE_ADMIN_IDS } from '../env.js';
import { callDiscordApi } from '../lib/util.js';
import { connection, db, sessions, users } from './schema.js';

async function seed() {
  console.log('Seeding the database...');

  // Clean existing data
  // console.log('Cleaning existing data...');
  // await db.delete(users);
  // await db.delete(sessions);

  console.log('Inserting seed data...');

  for (const id of SITE_ADMIN_IDS.split(',')) {
    const userinfo = await callDiscordApi(`users/${id}`);
    const json = await userinfo.json();

    await db
      .insert(users)
      .values({
        id: json['id'],
        username: json['username'],
        avatar: json['avatar'],

        promotedOn: new Date(),
        refreshToken: '',
        accessToken: '',
        accessTokenExpiration: new Date()
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          username: json['username'],
          avatar: json['avatar'],
          promotedOn: new Date()
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
