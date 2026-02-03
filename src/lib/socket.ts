import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents, SocketChatMessage, SocketUser } from '~/types';

const SOCKET_URL = 'http://localhost:3001';

export function useSocket() {
	const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
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
	const [users, setUsers] = useState<SocketUser[]>([]);
	const [messages, setMessages] = useState<SocketChatMessage[]>([]);

	useEffect(() => {
		if (!socket || !isConnected || !userId || !username) return;

		socket.emit('join-room', roomId, { id: userId, username: username });

		socket.on('room-state', ({ users, messages }: { users: SocketUser[]; messages: SocketChatMessage[] }) => {
			setUsers(users);
			setMessages(messages);
		});

		socket.on('user-joined', (user: SocketUser) => {
			setUsers((prev) => [...prev, user]);
		});

		socket.on('user-left', (user: SocketUser) => {
			setUsers((prev) => prev.filter((u) => u.id !== user.id));
		});

		socket.on('chat-message', (message: SocketChatMessage) => {
			setMessages((prev) => [...prev, message]);
		});

		return () => {
			socket.emit('leave-room', roomId);
			socket.off('room-state');
			socket.off('user-joined');
			socket.off('user-left');
			socket.off('chat-message');
		};
	}, [socket, isConnected, roomId, userId, username]);

	const sendMessage = (content: string) => {
		if (socket && isConnected) {
			socket.emit('chat-message', roomId, content);
		}
	};

	return {
		users,
		messages,
		sendMessage,
		isConnected
	};
}
