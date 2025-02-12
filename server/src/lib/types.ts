import type { WSContext } from 'hono/ws';

// Server-specific

export type BaseCommand = {
  command: string;
  message_id: string;
};

export type PlayPauseCommand = BaseCommand & {
  curtime: number;
};

export type QueueCommand = BaseCommand & {
  add?: string;
  remove?: string;
  order?: number[];
  clear?: boolean;
};

export type ChatCommand = BaseCommand & {
  content: string;
};

export type BackgroundCommand = BaseCommand & {
  message_id: string;
  background: {
    url: string;
    size: string;
  };
};

export type SyncClient = {
  // User ID
  id: string;
  // Username
  username: string;
  // What room are we in?
  room: string;
  // WebSocket Context
  ws: WSContext;
};

export type RoomMetadata = {
  queue: {
    id: string;
    url: string;
    title: string;
  }[];
  queue_counter: number; // Not shared, internal counter
  start_time: number; // MS since UTC epoch
  stop_time?: number; // If set, overrides start_time
  playing: boolean;
  messages: {
    author: {
      id: string;
      username: string;
    };
    content: string;
    date: number; // When was this message sent?
  }[];
};

export type SyncRoomList = {
  [id: string]: RoomMetadata;
};

// Steam API

type TagEntry = {
  addedby: string;
  date: number;
};

export interface DatabasePlayerEntry {
  _id: string;
  addresses: {
    [ip: string]: {
      game: string;
      date: number;
    };
  };
  bandata: {
    vacbans: number;
    gamebans: number;
    communityban: boolean;
    tradeban: boolean;
  };
  names: {
    [name: string]: number;
  };
  notifications: {
    [guildid: string]: {
      ban: string[];
      name: string[];
      log: string[];
    };
  };
  tags: {
    [guildid: string]: {
      cheater?: TagEntry;
      suspicious?: TagEntry;
      popular?: TagEntry;
      banwatch?: TagEntry;
    };
  };
}
