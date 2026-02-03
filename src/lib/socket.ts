import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { SyncUserModel } from '~/.generated/prisma/models';

const SOCKET_URL = 'http://localhost:3001';

export type SocketChat = {
	id: string;
	userId: string;
	username: string;
	content: string;
	timestamp: Date;
}

export function useSocket() {
	const socketRef = useRef<Socket | null>(null);
	const [isConnected, setIsConnected] = useState(false);

	useEffect(() => {
		const socket = io(SOCKET_URL);
		socketRef.current = socket;

		socket.on('connect', () => {
			setIsConnected(true);
		});

		socket.on('disconnect', () => {
			setIsConnected(false);
		});

		return () => {
			socket.disconnect();
		};
	}, []);

	return { socket: socketRef.current, isConnected };
}

export function useRoom(roomId: string, userId: string | null, username: string | null) {
	const { socket, isConnected } = useSocket();
	const [users, setUsers] = useState<SyncUserModel[]>([]);
	const [messages, setMessages] = useState<SocketChat[]>([]);

	useEffect(() => {
		if (!socket || !isConnected || !userId) return;

		socket.emit('join-room', { roomId, userId, username });

		socket.on('room-state', ({ users, messages }: { users: SyncUserModel[]; messages: SocketChat[] }) => {
			setUsers(users);
			setMessages(messages);
		});

		socket.on('user-joined', (user: SyncUserModel) => {
			setUsers((prev) => [...prev, user]);
		});

		socket.on('user-left', (user: SyncUserModel) => {
			setUsers((prev) => prev.filter((u) => u.id !== user.id));
		});

		socket.on('chat-message', (message: SocketChat) => {
			setMessages((prev) => [...prev, message]);
		});

		return () => {
			socket.emit('leave-room', { roomId });
			socket.off('room-state');
			socket.off('user-joined');
			socket.off('user-left');
			socket.off('chat-message');
			socket.off('video-state');
		};
	}, [socket, isConnected, roomId, userId, username]);

	const sendMessage = (content: string) => {
		if (socket && isConnected) {
			socket.emit('chat-message', { roomId, content });
		}
	};

	return {
		users,
		messages,
		sendMessage,
		isConnected
	};
}
