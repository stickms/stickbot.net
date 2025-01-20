import { persistentAtom, persistentMap } from '@nanostores/persistent';
import { UserType, GuildType } from './types';
import { atom } from 'nanostores';

const default_user: UserType = {
  avatar: '',
  id: '',
  discord_id: '',
  username: '',
  token_guild: '',
  is_admin: false,
};

export const $user = persistentMap<UserType>('user:', default_user, {
  encode: JSON.stringify,
  decode: JSON.parse
});

export const $guilds = persistentAtom<GuildType[]>('guilds:', [], {
  encode: JSON.stringify,
  decode: JSON.parse
});

export const $guildid = atom<string>('');

export function setUser(user: Partial<UserType>) {
  $user.set({ ...$user.get(), ...user });
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
  $user.set({
    ...$user.get(),
    is_admin: admin
  });
}
