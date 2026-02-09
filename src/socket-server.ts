import { createServer } from 'node:http';
import { arrayMove } from '@dnd-kit/sortable';
import { Server, type Socket } from 'socket.io';
import { prisma } from './lib/prisma';
import { getContentDispositionFilename } from './lib/utils';
import type {
	ClientToServerEvents,
	ServerToClientEvents,
	SocketChatMessage,
	SocketQueueEntry,
	SocketUser
} from './types';

const httpServer = createServer();

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
	cors: {
		origin: [ 'http://localhost:3000', 'https://stickbot.net' ],
		methods: ['GET', 'POST']
	}
});

interface Room {
	users: Map<string, SocketUser>;
	playing: boolean;
	curtime: number;
	lastUpdated: number;
}

function getRoomCurtime(room: Room): number {
	if (room.playing) {
		return room.curtime + (Date.now() - room.lastUpdated) / 1000;
	}

	return room.curtime;
}

const rooms = new Map<string, Room>();

io.on('connection', (socket) => {
	console.log('Client connected:', socket.id);

	socket.on('join-room', (roomId, user) => {
		socket.join(roomId);

		if (!rooms.has(roomId)) {
			rooms.set(roomId, { users: new Map(), playing: false, curtime: 0, lastUpdated: Date.now() });
		}

		// biome-ignore lint/style/noNonNullAssertion: false positive
		const room = rooms.get(roomId)!;
		room.users.set(socket.id, user);

		socket.to(roomId).emit('user-joined', user);

		prisma.syncRoom
			.findUnique({
				where: { id: roomId },
				include: {
					messages: { include: { owner: true }, orderBy: { timestamp: 'asc' } },
					queue: { include: { owner: true }, orderBy: { order: 'asc' } }
				}
			})
			.then((syncRoom) => {
				const messages: SocketChatMessage[] =
					syncRoom?.messages.map((message) => ({
						id: message.id,
						user: message.owner,
						content: message.content,
						timestamp: message.timestamp.getTime()
					})) ?? [];

				const queue: SocketQueueEntry[] =
					syncRoom?.queue.map((media) => ({
						id: media.id,
						user: media.owner,
						url: media.url,
						title: media.title
					})) ?? [];

				socket.emit('room-state', {
					users: Array.from(room.users.values()),
					messages: messages,
					queue: queue
				});

				socket.emit('media-state', {
					playing: room.playing,
					curtime: getRoomCurtime(room)
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

				if (
					!contentType?.startsWith('audio/') &&
					!contentType?.startsWith('video/')
				) {
					throw new Error('Unsupported media type');
				}

				return (
					getContentDispositionFilename(
						head_res.headers.get('content-disposition')
					) ?? 'Unknown Title'
				);
			}

			return json.title ?? 'Unknown Title';
		};

		getMediaTitle()
			.then(async (title) => {
				const room = rooms.get(roomId);
				const user = room?.users.get(socket.id);

				if (!user) {
					return;
				}

				const maxOrder = await prisma.syncMedia.aggregate({
					where: { roomId },
					_max: { order: true }
				});

				prisma.syncMedia
					.create({
						data: {
							ownerId: user.id,
							roomId: roomId,
							url: url,
							title: title,
							order: (maxOrder._max.order ?? -1) + 1
						},
						include: {
							syncRoom: {
								include: {
									queue: true
								}
							}
						}
					})
					.then((media) => {
						io.to(roomId).emit('queue-media', {
							id: media.id,
							title: title,
							url: url,
							user: user
						});

						if (room && media.syncRoom.queue.length === 1) {
							room.curtime = 0;
							room.lastUpdated = Date.now();
							io.to(roomId).emit('media-state', {
								playing: room.playing,
								curtime: 0
							});
						}
					});
			})
			.catch(console.error);
	});

	socket.on('dequeue-media', (roomId, mediaId) => {
		prisma.syncMedia
			.delete({ where: { id: mediaId } })
			.then((media) => {
				io.to(roomId).emit('dequeue-media', media.id);
			})
			.catch(console.error);
	});

	socket.on('order-media', async (roomId, from, to) => {
		const room = await prisma.syncRoom.findUnique({
			where: { id: roomId },
			include: { queue: { orderBy: { order: 'asc' } } }
		});

		if (!room) {
			return;
		}

		const queue = arrayMove(room.queue, from, to);

		// Update each item's order
		await Promise.all(
			queue.map((media, index) =>
				prisma.syncMedia.update({
					where: { id: media.id },
					data: { order: index }
				})
			)
		);

		io.to(roomId).emit('order-media', from, to);
	});

	socket.on('chat-message', (roomId, content) => {
		const room = rooms.get(roomId);
		const user = room?.users.get(socket.id);

		if (!user) {
			return;
		}

		prisma.syncMessage
			.create({
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
					timestamp: Date.now()
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

		// Snapshot current position before changing state
		room.curtime = getRoomCurtime(room);
		room.lastUpdated = Date.now();

		if (state.playing !== undefined) {
			room.playing = state.playing;
		}

		if (state.curtime !== undefined) {
			room.curtime = state.curtime;
			room.lastUpdated = Date.now();
		}

		socket.to(roomId).emit('media-state', {
			playing: room.playing,
			curtime: room.curtime
		});
	});
});

function handleLeaveRoom(socket: Socket, roomId: string) {
	const room = rooms.get(roomId);
	if (!room) return;

	const user = room.users.get(socket.id);
	if (user) {
		room.users.delete(socket.id);
		socket
			.to(roomId)
			.emit('user-left', { id: user.id, username: user.username });
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
