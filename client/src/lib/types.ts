// Discord Types
export type UserType = {
  avatar: string;
  id: string;
  username: string;
  token_guild: string;
  is_admin: boolean;

  sync: {
    room: string;
    is_host: boolean;
    is_leader: boolean;
  }
};

export type GuildType = {
  icon: string;
  id: string;
  name: string;
};

export type SyncRoom = {
  id: string;
  name: string;
  host: string;
  leaders: string[];
  users: string[];

  meta: {
    queue: string[];
    curtime: number;
    playing: boolean;
    messages: string[];
  }
}

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
};

export type Sourceban = {
  url: string;
  reason: string;
};
