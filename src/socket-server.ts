import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { prisma } from './lib/prisma';
import { SocketChat } from './lib/socket';

const httpServer = createServer();

const io = new Server(httpServer, {
	cors: {
		origin: 'http://localhost:3000',
		methods: ['GET', 'POST'],
	},
});

interface RoomUser {
	userId: string;
	username: string;
}

interface Room {
	users: Map<string, RoomUser>;
}

const rooms = new Map<string, Room>();

io.on('connection', (socket) => {
	console.log('Client connected:', socket.id);

	socket.on('join-room', ({ roomId, userId, username }: { roomId: string; userId: string; username: string }) => {
		socket.join(roomId);

		if (!rooms.has(roomId)) {
			rooms.set(roomId, { users: new Map() });
		}

		// biome-ignore lint/style/noNonNullAssertion: false positive
		const room = rooms.get(roomId)!;
		room.users.set(socket.id, { userId, username });

		socket.to(roomId).emit('user-joined', { id: userId, username });

		prisma.syncRoom.findUnique({ where: { id: roomId }, include: { messages: { include: { owner: true } } } })
			.then((syncRoom) => {
				const messages: SocketChat[] = syncRoom?.messages.map((message) => ({
					id: message.id,
					userId: message.ownerId,
					username: message.owner.username,
					content: message.content,
					timestamp: message.timestamp
				})) ?? [];

				socket.emit('room-state', {
					users: Array.from(room.users.values()),
					messages: messages
				});
			});

		console.log(`${username} joined room ${roomId}`);
	});

	socket.on('leave-room', ({ roomId }: { roomId: string }) => {
		handleLeaveRoom(socket, roomId);
	});

	socket.on('disconnect', () => {
		// Find and leave all rooms this socket was in
		for (const [roomId, room] of rooms) {
			if (room.users.has(socket.id)) {
				handleLeaveRoom(socket, roomId);
			}
		}

		console.log('Client disconnected:', socket.id);
	});

	socket.on('chat-message', ({ roomId, content }: { roomId: string; content: string }) => {
		const room = rooms.get(roomId);
		const user = room?.users.get(socket.id);
		
		if (user) {
			prisma.syncMessage.create({
				data: {
					ownerId: user.userId,
					roomId: roomId,
					content: content
				}
			})
				.then((message) => {
					io.to(roomId).emit('chat-message', {
						id: message.id,
						username: user.username,
						content,
						timestamp: Date.now(),
					});
				})
				.catch(console.error);
		}
	});
});

function handleLeaveRoom(socket: { id: string; to: (room: string) => { emit: (event: string, data: unknown) => void } }, roomId: string) {
	const room = rooms.get(roomId);
	if (!room) return;

	const user = room.users.get(socket.id);
	if (user) {
		room.users.delete(socket.id);
		socket.to(roomId).emit('user-left', { id: user.userId, username: user.username });
		console.log(`${user.username} left room ${roomId}`);
	}

	// Clean up empty rooms
	if (room.users.size === 0) {
		rooms.delete(roomId);
		console.log(`Room ${roomId} deleted (empty)`);
	}
}

const PORT = 3001;
httpServer.listen(PORT, () => {
	console.log(`Socket.IO server running on http://localhost:${PORT}`);
});
