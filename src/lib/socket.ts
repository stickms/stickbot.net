import { useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import type {
	ClientToServerEvents,
	ServerToClientEvents,
	SocketChatMessage,
	SocketMediaState,
	SocketQueueEntry,
	SocketUser,
} from '~/types';

const SOCKET_URL = 'http://localhost:3001';

// Singleton socket instance
let socketInstance: Socket<ServerToClientEvents, ClientToServerEvents> | null =
	null;

function getSocket() {
	if (!socketInstance) {
		socketInstance = io(SOCKET_URL);
	}
	return socketInstance;
}

export function useSocket() {
	const [isConnected, setIsConnected] = useState(false);

	useEffect(() => {
		const socket = getSocket();

		const onConnect = () => setIsConnected(true);
		const onDisconnect = () => setIsConnected(false);

		socket.on('connect', onConnect);
		socket.on('disconnect', onDisconnect);
		setIsConnected(socket.connected);

		return () => {
			socket.off('connect', onConnect);
			socket.off('disconnect', onDisconnect);
		};
	}, []);

	return { socket: getSocket(), isConnected };
}

export function useRoom(
	roomId: string,
	userId: string | null,
	username: string | null,
) {
	const { socket, isConnected } = useSocket();
	const [users, setUsers] = useState<SocketUser[]>([]);
	const [messages, setMessages] = useState<SocketChatMessage[]>([]);
	const [queue, setQueue] = useState<SocketQueueEntry[]>([]);
	const [mediaState, setMediaState] = useState<SocketMediaState>();

	useEffect(() => {
		if (!socket || !isConnected || !userId || !username) return;

		socket.emit('join-room', roomId, { id: userId, username: username });

		socket.on('room-state', (state) => {
			state.users && setUsers(state.users);
			state.messages && setMessages(state.messages);
			state.queue && setQueue(state.queue);
		});

		socket.on('media-state', (state) => {
			setMediaState(state);
		});

		socket.on('user-joined', (user) => {
			setUsers((prev) => [...prev, user]);
		});

		socket.on('user-left', (user) => {
			// Delete first instance (just in case a user joins multiple times)
			setUsers((prev) => {
				const index = prev.findIndex((u) => u.id === user.id);
				return index !== -1 ? prev.slice(index) : prev;
			});
		});

		socket.on('chat-message', (message) => {
			setMessages((prev) => [...prev, message]);
		});

		socket.on('queue-media', (media) => {
			setQueue((prev) => [...prev, media]);
		});

		socket.on('dequeue-media', (id: string) => {
			setQueue((prev) => prev.filter((media) => media.id !== id));
		});

		return () => {
			socket.emit('leave-room', roomId);
			socket.off('room-state');
			socket.off('media-state');
			socket.off('user-joined');
			socket.off('user-left');
			socket.off('chat-message');
			socket.off('queue-media');
			socket.off('dequeue-media');
		};
	}, [socket, isConnected, roomId, userId, username]);

	const sendMessage = (content: string) => {
		if (socket && isConnected) {
			socket.emit('chat-message', roomId, content);
		}
	};

	const queueMedia = (url: string) => {
		if (socket && isConnected) {
			socket.emit('queue-media', roomId, url);
		}
	};

	const dequeueMedia = (mediaId: string) => {
		if (socket && isConnected) {
			socket.emit('dequeue-media', roomId, mediaId);
		}
	};

	const sendMediaState = (playing?: boolean, curtime?: number) => {
		if (socket && isConnected) {
			socket.emit('media-state', roomId, { playing, curtime });
		}
	};

	return {
		users,
		messages,
		queue,
		mediaState,
		sendMessage,
		queueMedia,
		dequeueMedia,
		sendMediaState,
		isConnected,
	};
}
