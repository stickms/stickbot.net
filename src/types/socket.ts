export interface ServerToClientEvents {
	'user-joined': (user: SocketUser) => void;
	'user-left': (user: SocketUser) => void;
	'room-state': (state: Partial<SocketRoomState>) => void;
	'media-state': (state: SocketMediaState) => void;
	'chat-message': (message: SocketChatMessage) => void;
	'queue-media': (media: SocketQueueEntry) => void;
	'dequeue-media': (mediaId: string) => void;
}

export interface ClientToServerEvents {
	'join-room': (roomId: string, user: SocketUser) => void;
	'leave-room': (roomId: string) => void;
	'chat-message': (roomId: string, content: string) => void;
	'queue-media': (roomId: string, url: string) => void;
	'media-state': (roomId: string, state: Partial<SocketMediaState>) => void;
	'dequeue-media': (roomId: string, mediaId: string) => void;
}

export type SocketUser = {
	id: string;
	username: string;
};

export type SocketChatMessage = {
	id: string;
	user: SocketUser;
	content: string;
	timestamp: number;
};

export type SocketQueueEntry = {
	id: string;
	title: string;
	url: string;
	user: SocketUser;
};

export type SocketRoomState = {
	users: SocketUser[];
	messages: SocketChatMessage[];
	queue: SocketQueueEntry[];
};

export type SocketMediaState = {
	playing: boolean;
	curtime: number;
};
