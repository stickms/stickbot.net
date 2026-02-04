export interface ServerToClientEvents {
  'user-joined': (user: SocketUser) => void;
  'user-left': (user: SocketUser) => void;
  'room-state': (state: Partial<SocketRoomState>) => void;
  'media-state': (state: Partial<SocketMediaState>) => void;
  'chat-message': ( message: SocketChatMessage ) => void;
  'queue-media': ( media: SocketQueueEntry ) => void;
}

export interface ClientToServerEvents {
  'join-room': ( roomId: string, user: SocketUser ) => void;
  'leave-room': ( roomId: string ) => void;
  'chat-message': ( roomId: string, content: string ) => void;
  'queue-media': ( roomId: string, url: string ) => void;
}

export type SocketUser = {
  id: string;
  username: string;
}

export type SocketChatMessage = {
  id: string;
	user: SocketUser;
	content: string;
	timestamp: number;
}

export type SocketQueueEntry = {
  id: string;
  title: string;
  url: string;
  owner: SocketUser;
}

export type SocketRoomState = {
  users: SocketUser[],
  messages: SocketChatMessage[],
  queue: SocketQueueEntry[]
}

export type SocketMediaState = {
  media: SocketQueueEntry,
  playing: boolean,
  curtime: number
}
