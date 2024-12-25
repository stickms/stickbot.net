import { persistentAtom, persistentMap } from '@nanostores/persistent';
import { DiscordUser, DiscordGuild } from '../types/discord';

const default_user: DiscordUser = {
  avatar: '',
  id: '',
  username: ''
};

export const $user = persistentMap<DiscordUser>('user:', default_user);
export const $guilds = persistentAtom<DiscordGuild[]>('guilds:', [], {
  encode: JSON.stringify,
  decode: JSON.parse,
});

export function setUser(user: DiscordUser) {
  $user.set(user);
}

export function clearUser() {
  $user.set(default_user);
}

export function setGuilds(guilds: DiscordGuild[]) {
  $guilds.set(guilds);
}

export function clearGuilds() {
  $guilds.set([]);
}

