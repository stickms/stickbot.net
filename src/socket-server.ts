import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { prisma } from './lib/prisma';
import { getContentDispositionFilename } from './lib/utils';
import type { ClientToServerEvents, ServerToClientEvents, SocketChatMessage, SocketQueueEntry, SocketUser } from './types';

const httpServer = createServer();

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
	cors: {
		origin: 'http://localhost:3000',
		methods: ['GET', 'POST'],
	},
});

interface Room {
	users: Map<string, SocketUser>;
	playing: boolean;
	started: number;
}

const rooms = new Map<string, Room>();

io.on('connection', (socket) => {
	console.log('Client connected:', socket.id);

	socket.on('join-room', (roomId, user) => {
		socket.join(roomId);

		if (!rooms.has(roomId)) {
			rooms.set(roomId, { users: new Map(), playing: false, started: 0 });
		}

		// biome-ignore lint/style/noNonNullAssertion: false positive
		const room = rooms.get(roomId)!;
		room.users.set(socket.id, user);

		socket.to(roomId).emit('user-joined', user);

		prisma.syncRoom.findUnique({ where: { id: roomId }, include: { messages: { include: { owner: true } }, queue: { include: { owner: true } } } })
			.then((syncRoom) => {
				const messages: SocketChatMessage[] = syncRoom?.messages.map((message) => ({
					id: message.id,
					user: message.owner,
					content: message.content,
					timestamp: message.timestamp.getMilliseconds()
				})) ?? [];

				const queue: SocketQueueEntry[] = syncRoom?.queue.map((media) => ({
					id: media.id,
					user: media.owner,
					url: media.url,
					title: media.title,
				})) ?? [];

				socket.emit('room-state', {
					users: Array.from(room.users.values()),
					messages: messages,
					queue: queue
				});

				socket.emit('media-state', {
					playing: room.playing,
					curtime: Date.now() - room.started
				});
			});

		console.log(`${user.username} joined room ${roomId}`);
	});

	socket.on('leave-room', (roomId) => {
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

	socket.on('queue-media', (roomId, url) => {
		const getMediaTitle = async () => {
			if (!URL.parse(url)) {
				throw new Error('Invalid URL');
			}

			const noembed_res = await fetch(`https://noembed.com/embed?url=${url}`);
			const json = await noembed_res.json();

			if (!noembed_res.ok || json.error) {
				const head_res = await fetch(url, { method: 'HEAD' });

				if (!head_res.ok) {
					throw new Error('Could not get URL data');
				}

				const contentType = head_res.headers.get('content-type');

				if (!contentType?.startsWith('audio/') && !contentType?.startsWith('video/')) {
					throw new Error('Unsupported media type');
				}

				return getContentDispositionFilename(head_res.headers.get('content-disposition')) ?? 'Unknown Title';
			}

			return json.title ?? 'Unknown Title';
		};

		getMediaTitle()
			.then((title) => {
				const room = rooms.get(roomId);
				const user = room?.users.get(socket.id);

				if (!user) {
					return;
				}

				prisma.syncMedia.create({
					data: {
						ownerId: user.id,
						roomId: roomId,
						url: url,
						title: title
					}
				})
					.then((media) => {
						io.to(roomId).emit('queue-media', {
							id: media.id,
							title: title,
							url: url,
							user: user
						});
					})
					.catch(console.error);

			})
			.catch(console.error);
	});

	socket.on('chat-message', (roomId, content) => {
		const room = rooms.get(roomId);
		const user = room?.users.get(socket.id);

		if (!user) {
			return;
		}
		
		prisma.syncMessage.create({
			data: {
				ownerId: user.id,
				roomId: roomId,
				content: content
			}
		})
			.then((message) => {
				io.to(roomId).emit('chat-message', {
					id: message.id,
					user: user,
					content,
					timestamp: Date.now(),
				});
			})
			.catch(console.error);
	});

	socket.on('media-state', (roomId, state) => {
		const room = rooms.get(roomId);
		const user = room?.users.get(socket.id);

		if (!room || !user) {
			return;
		}

		if (state.playing !== undefined) {
			room.playing = state.playing;
		}

		if (state.curtime !== undefined) {
			room.started = Date.now() - (state.curtime * 1000);
		}

		io.to(roomId).emit('media-state', {
			playing: room.playing,
			curtime: (Date.now() - room.started) / 1000
		});
	});
});

function handleLeaveRoom(socket: { id: string; to: (room: string) => { emit: (event: string, data: unknown) => void } }, roomId: string) {
	const room = rooms.get(roomId);
	if (!room) return;

	const user = room.users.get(socket.id);
	if (user) {
		room.users.delete(socket.id);
		socket.to(roomId).emit('user-left', { id: user.id, username: user.username });
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
