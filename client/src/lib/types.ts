// Discord Types
export type DiscordUser = {
  // accent_color: number,
  avatar: string,
  // avatar_decoration_data: unknown,
  // banner: string,
  // banner_color: string,
  // clan: unknown,
  // discriminator: string,
  // flags: number,
  // global_name: string,
  id: string,
  // locale: string,
  // mfa_enabled: boolean,
  // premium_type: number,
  // primary_guild: unknown,
  // public_flags: number,
  username: string
};

export type DiscordGuild = {
  // banner: string,
  // featers: string[],
  icon: string,
  id: string,
  name: string,
  // owner: boolean,
  // permissions: string
};

// Steam Types

export type SteamProfileSummary = {
  // GetPlayerSummary
  steamid: string;
  communityvisibilitystate: number;
  profilestate: number;
  personaname: string;
  commentpermission?: number;
  profileurl: string;
  avatar: string;
  avatarmedium: string;
  avatarfull: string;
  avatarhash: string;
  personastate: number;
  realname?: string;
  primaryclanid?: string;
  timecreated?: number;
  personastateflags: number;
  loccountrycode?: string;
  locstatecode?: string;
  loccityid?: number;
  gameid?: string;
  gameextrainfo?: string;
  gameserverip?: string;

  // GetPlayerBans
  CommunityBanned: boolean;
  VACBanned: boolean;
  NumberOfVACBans: number;
  DaysSinceLastBan: number;
  NumberOfGameBans: number;
  EconomyBan: string;

  // Sourcebans
  sourcebans: Sourceban[] | undefined;
};

export type Sourceban = {
  url: string;
  reason: string;
};
