import { persistentAtom, persistentMap } from '@nanostores/persistent';
import { UserType, GuildType } from './types';
import { atom } from 'nanostores';

const default_user: UserType = {
  avatar: '',
  id: '',
  username: '',
  token_guild: ''
};

export const $user = persistentMap<UserType>('user:', default_user);
export const $guilds = persistentAtom<GuildType[]>('guilds:', [], {
  encode: JSON.stringify,
  decode: JSON.parse
});

export const $admin = persistentAtom<boolean>('admin:', false, {
  encode: JSON.stringify,
  decode: JSON.parse
});

export const $guildid = atom<string>('');

export function setUser(user: UserType) {
  $user.set(user);
}

export function clearUser() {
  $user.set(default_user);
}

export function setGuilds(guilds: GuildType[]) {
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

export function setAdmin(admin: boolean) {
  $admin.set(admin);
}
