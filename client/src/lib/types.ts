// Discord Types
export type UserType = {
  avatar: string;
  id: string;
  discord_id: string;
  username: string;
  token_guild: string;
  is_admin: boolean;
};

export type GuildType = {
  icon: string;
  id: string;
  name: string;
};

export type SyncRoomQueue = {
  id: string;
  url: string;
  title: string;
}[];

export type SyncRoomMessages = {
  author: {
    id: string;
    username: string;
  };
  content: string;
  date: number;
}[];

export type SyncRoom = {
  id: string;
  name: string;
  host: {
    id: string;
    username: string;
  };
  users: string[];
  background: {
    url?: string;
    size?: string;
  };

  meta: {
    queue: SyncRoomQueue;
    curtime: number;
    playing: boolean;
    messages: SyncRoomMessages;
  };
};

export type SyncSettings = {
  hide_chat: boolean;
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
};

export type Sourceban = {
  url: string;
  reason: string;
};

// HUD Editor Types
import { KeyValues } from './keyvalues';

export type HudFile = {
  name: string;
  path: string;
  content: string;
};

export type FontFile = {
  name: string;
  url: string;
  family: string;
  blob?: Blob;
};

export type SkippedElement = {
  name: string;
  line?: number;
  reason: 'zero-size' | 'missing-position';
};

export type MissingFont = {
  name: string;
  line?: number;
  fontName: string;
  mappedFamily: string;
  sourceFile?: string;
};

export type SchemeBorderMap = Record<string, KeyValues>;
