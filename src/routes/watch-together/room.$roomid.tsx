import {
	DndContext,
	type DragEndEvent,
	MouseSensor,
	rectIntersection,
	TouchSensor,
	useDroppable,
	useSensor,
	useSensors
} from '@dnd-kit/core';
import {
	restrictToParentElement,
	restrictToVerticalAxis
} from '@dnd-kit/modifiers';
import {
	arrayMove,
	SortableContext,
	useSortable,
	verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { PlusSquareIcon, SendIcon, TrashIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import ReactPlayer from 'react-player';
import { Card } from '~/components/card';
import { InputButton } from '~/components/input-button';
import { Button } from '~/components/ui/button';
import { ScrollArea } from '~/components/ui/scroll-area';
import { prisma } from '~/lib/prisma';
import { useRoom } from '~/lib/socket';
import { type UserStore, useUserStore } from '~/lib/stores';
import type { SocketQueueEntry } from '~/types';

import '~/styles/chat-box.css';

function formatTimestamp(timestamp: number | string | Date) {
	const date = new Date(timestamp);
	const now = new Date();

	if (date.toDateString() === now.toDateString()) {
		return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
	}

	return date.toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

const getRoomData = createServerFn({ method: 'GET' })
	.inputValidator((data: { roomid: string }) => data)
	.handler(async ({ data }) => {
		const { roomid } = data;

		const room = await prisma.syncRoom.findUnique({ where: { id: roomid } });

		// Redirect if room doesn't exist
		if (!room) {
			throw redirect({ to: '/watch-together' });
		}

		return room;
	});

export const Route = createFileRoute('/watch-together/room/$roomid')({
	component: RouteComponent,
	loader: ({ params }) => getRoomData({ data: { roomid: params.roomid } }),
	ssr: false
});

function ChatBox({
	room,
	user
}: {
	room: { id: string; ownerId: string };
	user: UserStore;
}) {
	const inputRef = useRef<HTMLInputElement>(null);
	const messagesEndRef = useRef<HTMLDivElement>(null);

	const { users, messages, sendMessage } = useRoom(
		room.id,
		user.id,
		user.username
	);

	// biome-ignore lint/correctness/useExhaustiveDependencies: scroll when messages change
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [messages.length]);

	const sendSyncMessage = () => {
		if (!inputRef.current?.value) {
			return;
		}

		sendMessage(inputRef.current.value);
		inputRef.current.value = '';
	};

	return (
		<div className="h-100 min-[850px]:h-auto min-[850px]:row-start-1 relative">
			<Card className="chat-box absolute inset-0 overflow-hidden">
				<ScrollArea className="chat-box-users size-full min-h-0" type="always">
					<div className="flex flex-col w-full text-left gap-2">
						{/* Only show unique users (people can open other tabs, etc.) */}
						{users
							.filter(
								(u, index, arr) => index === arr.findIndex((e) => e.id === u.id)
							)
							.map(({ id, username }) => (
								<span
									key={id}
									style={{
										color:
											room.ownerId === id ? 'var(--color-primary)' : undefined
									}}
								>
									{username}
								</span>
							))}
					</div>
				</ScrollArea>

				<ScrollArea
					className="chat-box-messages size-full min-h-0"
					type="always"
				>
					<div className="flex flex-col w-full text-left gap-2">
						{messages.map(({ id, user, content, timestamp }) => (
							<div key={id} className='text-sm'>
								<span className='text-xs text-muted-foreground pr-1'>
									{formatTimestamp(timestamp)}
								</span>
								<span
									style={{
										color:
											room.ownerId === user.id
												? 'var(--color-primary)'
												: undefined
									}}
								>
									{user.username}
								</span>
								<span> : {content}</span>
							</div>
						))}
						<div ref={messagesEndRef} />
					</div>
				</ScrollArea>

				<InputButton
					className="chat-box-input"
					placeholder="Send a message..."
					ref={inputRef}
					icon={<SendIcon />}
					onSubmit={sendSyncMessage}
				/>
			</Card>
		</div>
	);
}

function QueueEntry({
	media,
	dequeue
}: {
	media: SocketQueueEntry;
	dequeue: (id: string) => void;
}) {
	const {
		isDragging,
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition
	} = useSortable({ id: media.id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition
	};

	return (
		<Card
			ref={setNodeRef}
			className="flex justify-between items-center gap-1 text-left w-full py-1.5!"
			style={{ ...style, pointerEvents: isDragging ? 'none' : 'auto' }}
			{...listeners}
			{...attributes}
		>
			<span>
				<a
					className="link"
					href={media.url}
					target="_blank"
					rel="noopener noreferrer"
				>
					{media.title}
				</a>
			</span>
			<span className="text-sm italic text-muted-foreground">
				added by {media.user.username}
			</span>
			<Button
				variant="ghost"
				onClick={() => dequeue(media.id)}
				disabled={isDragging}
			>
				<TrashIcon className="text-destructive" />
			</Button>
		</Card>
	);
}

function MediaQueue({ roomId, user }: { roomId: string; user: UserStore }) {
	const inputRef = useRef<HTMLInputElement>(null);

	const { queue, queueMedia, dequeueMedia, orderMedia, sendMediaState } =
		useRoom(roomId, user.id, user.username);

	const { setNodeRef } = useDroppable({
		id: 'droppable'
	});

	const [internalQueue, setInternalQueue] = useState<SocketQueueEntry[]>([]);

	const mouseSensor = useSensor(MouseSensor, {
		activationConstraint: {
			distance: 10
		}
	});

	const touchSensor = useSensor(TouchSensor, {
		activationConstraint: {
			delay: 250,
			tolerance: 5
		}
	});
	const sensors = useSensors(mouseSensor, touchSensor);

	useEffect(() => {
		setInternalQueue(queue);
	}, [queue]);

	const queueSyncMedia = () => {
		if (!inputRef.current?.value) {
			return;
		}

		queueMedia(inputRef.current.value);
		inputRef.current.value = '';
	};

	const dequeueSyncMedia = (mediaId: string) => {
		if (mediaId === queue[0]?.id) {
			sendMediaState(undefined, 0);
		}

		dequeueMedia(mediaId);
	};

	const onDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;

		if (!over || active.id === over.id) {
			return;
		}

		const from = queue.findIndex((m) => m.id === active.id);
		const to = queue.findIndex((m) => m.id === over.id);

		if (from === -1 || to === -1) {
			return;
		}

		if (from === 0 || to === 0) {
			sendMediaState(undefined, 0);
		}

		setInternalQueue((prev) => arrayMove(prev, from, to));
		orderMedia(from, to);
	};

	return (
		<div className="flex flex-col gap-2 min-[850px]:col-start-2">
			{/* Media Queue Input */}
			<InputButton
				className="w-full"
				placeholder="Enter media url..."
				ref={inputRef}
				icon={<PlusSquareIcon />}
				onSubmit={queueSyncMedia}
			/>

			{/* Queue List */}
			{!!internalQueue.length && <DndContext
				collisionDetection={rectIntersection}
				modifiers={[restrictToParentElement, restrictToVerticalAxis]}
				sensors={sensors}
				onDragEnd={onDragEnd}
			>
				<SortableContext
					items={internalQueue}
					strategy={verticalListSortingStrategy}
				>
					<Card ref={setNodeRef} className="flex flex-col gap-2">
						{internalQueue.map((media) => (
							<QueueEntry
								key={media.id}
								media={media}
								dequeue={dequeueSyncMedia}
							/>
						))}
					</Card>
				</SortableContext>
			</DndContext>}
		</div>
	);
}

function MediaPlayer({ roomId, user }: { roomId: string; user: UserStore }) {
	const playerRef = useRef<HTMLVideoElement>(null);
	const { queue, mediaState, dequeueMedia, sendMediaState } = useRoom(
		roomId,
		user.id,
		user.username
	);
	const [ready, setReady] = useState<boolean>(false);

	const onReady = () => {
		if (ready || !playerRef.current || !mediaState) {
			return;
		}

		playerRef.current.currentTime = mediaState.curtime;
		if (mediaState.playing) {
			playerRef.current.play();
		} else {
			playerRef.current.pause();
		}

		setReady(true);
	};

	useEffect(() => {
		if (!playerRef.current || !mediaState) {
			return;
		}

		if (mediaState.playing && playerRef.current.paused) {
			playerRef.current.play();
		} else if (!mediaState.playing && !playerRef.current.paused) {
			playerRef.current.pause();
		}

		if (Math.abs(playerRef.current.currentTime - mediaState.curtime) > 2.5) {
			playerRef.current.currentTime = mediaState.curtime;
		}
	}, [mediaState]);

	return (
		<Card className="aspect-video min-[850px]:col-start-2 min-[850px]:row-start-1">
			{!!queue.length && mediaState && (
				<ReactPlayer
					ref={playerRef}
					src={queue[0].url}
					style={{ width: '100%', height: '100%' }}
					controls
					autoPlay
					muted
					onReady={onReady}
					onEnded={() => {
						if (playerRef.current) {
							sendMediaState(undefined, 0);
							dequeueMedia(queue[0].id);
						}
					}}
					onPlay={() =>
						ready && sendMediaState(true, playerRef.current?.currentTime)
					}
					onPause={() =>
						ready &&
						sendMediaState(
							playerRef.current?.seeking ? undefined : false,
							playerRef.current?.currentTime
						)
					}
				/>
			)}
		</Card>
	);
}

function RouteComponent() {
	const navigate = useNavigate();
	const room = Route.useLoaderData();
	const user = useUserStore();

	if (!user.id) {
		navigate({ to: '/watch-together' });
		return null;
	}

	return (
		<div className="w-full flex flex-col items-center justify-center mt-16 mb-16 gap-8 text-center">
			<h1 className="font-header text-5xl">{room.name}</h1>

			<div className="grid grid-cols-1 min-[850px]:grid-cols-[40fr_60fr] gap-4 w-full max-w-[95vw]">
				{/* Media Player */}
				<MediaPlayer roomId={room.id} user={user} />

				{/* Queue */}
				<MediaQueue roomId={room.id} user={user} />

				{/* Chat message box */}
				<ChatBox room={room} user={user} />
			</div>
		</div>
	);
}
