import type { Env } from 'hono';
import type { Session, User } from '../db/schema.js';

export interface Context extends Env {
  Variables: {
    user: User | null;
    session: Session | null;
  };
}
