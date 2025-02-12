import type { WSContext } from 'hono/ws';

// Server-specific

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
