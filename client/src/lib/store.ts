import { persistentAtom, persistentMap } from '@nanostores/persistent';
import { DiscordUser, DiscordGuild } from '../types/discord';
import { atom } from 'nanostores';

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

export const $guildid = atom<string>('');

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

export function setGuildId(guildid: string) {
  $guildid.set(guildid);
}

export function clearGuildId() {
  $guildid.set('');
}

