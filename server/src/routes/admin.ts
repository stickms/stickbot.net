import { Hono } from 'hono';
import type { Context } from '../lib/context.js';
import { adminGuard } from '../middleware/admin-guard.js';
import { HTTPException } from 'hono/http-exception';
import { db, users } from '../db/schema.js';
import { eq, isNotNull } from 'drizzle-orm';

const admin_route = new Hono<Context>();

admin_route.get('/admin/validate', adminGuard, async (c) => {
  // Would not pass the adminGuard otherwise
  return c.json({
    success: true,
    message: 'Successfully validated as admin!'
  });
});

admin_route.get('/admin/list-users', adminGuard, async (c) => {
  const user_list = await db
    .select({
      id: users.id,
      discord_id: users.discordId,
      username: users.username,
      avatar: users.avatar,
      is_admin: isNotNull(users.promotedOn).mapWith(Boolean)
    })
    .from(users);

  return c.json({
    success: true,
    data: user_list
  });
});

admin_route.post('/admin/add', adminGuard, async (c) => {
  const userid = c.req.query('userid');

  if (!userid) {
    throw new HTTPException(400, { message: 'Please supply a valid userid' });
  }

  const user = db.select().from(users).where(eq(users.id, userid)).get();

  if (!user) {
    throw new HTTPException(404, {
      message: "Could not find user, make sure they've registered first"
    });
  }

  if (user.promotedOn !== null) {
    throw new HTTPException(400, {
      message: `User '${user.id}' is already an admin`
    });
  }

  await db
    .update(users)
    .set({
      promotedOn: new Date()
    })
    .where(eq(users.id, user.id));

  return c.json({
    success: true,
    message: `Made user '${user.id}' an admin`
  });
});

admin_route.post('/admin/remove', adminGuard, async (c) => {
  const userid = c.req.query('userid');

  if (!userid) {
    throw new HTTPException(400, { message: 'Please supply a valid userid' });
  }

  const user = db.select().from(users).where(eq(users.id, userid)).get();

  if (!user) {
    throw new HTTPException(404, {
      message: "Could not find user, make sure they've registered first"
    });
  }

  if (!user.promotedOn) {
    throw new HTTPException(400, {
      message: `User '${user.id}' is already not an admin`
    });
  }

  if (user.promotedOn <= c.get('user')!.promotedOn!) {
    throw new HTTPException(400, {
      message: `You cannot demote someone made admin before you`
    });
  }

  await db
    .update(users)
    .set({
      promotedOn: null
    })
    .where(eq(users.id, user.id));

  return c.json({
    success: true,
    message: `Demoted user '${user.id}' from admin`
  });
});

export default admin_route;
