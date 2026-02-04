import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { PlusSquareIcon, SendIcon, TrashIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import ReactPlayer from 'react-player';
import { Card } from '~/components/card';
import { Button } from '~/components/ui/button';
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from '~/components/ui/input-group';
import { ScrollArea } from '~/components/ui/scroll-area';
import { prisma } from '~/lib/prisma';
import { useRoom } from '~/lib/socket';
import { type UserStore, useUserStore } from '~/lib/stores';

import '~/styles/chat-box.css';

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
	ssr: false,
});

function ChatBox({ roomId, user }: { roomId: string; user: UserStore }) {
	const inputRef = useRef<HTMLInputElement>(null);
	const messagesEndRef = useRef<HTMLDivElement>(null);

	const { users, messages, sendMessage } = useRoom(
		roomId,
		user.id,
		user.username,
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
								(u, index, arr) =>
									index === arr.findIndex((e) => e.id === u.id),
							)
							.map(({ id, username }) => (
								<span key={id}>{username}</span>
							))}
					</div>
				</ScrollArea>

				<ScrollArea
					className="chat-box-messages size-full min-h-0"
					type="always"
				>
					<div className="flex flex-col w-full text-left gap-2">
						{messages.map(({ id, user, content }) => (
							<span key={id}>
								{user.username} : {content}
							</span>
						))}
						<div ref={messagesEndRef} />
					</div>
				</ScrollArea>

				<InputGroup className="chat-box-input">
					<InputGroupInput
						placeholder="Send a message..."
						ref={inputRef}
						onKeyDown={(e) => {
							if (e.key === 'Enter') {
								sendSyncMessage();
							}
						}}
					/>
					<InputGroupAddon align="inline-end">
						<InputGroupButton
							aria-label="Send Message"
							title="Send Message"
							size="icon-xs"
							variant="secondary"
							onClick={sendSyncMessage}
						>
							<SendIcon />
						</InputGroupButton>
					</InputGroupAddon>
				</InputGroup>
			</Card>
		</div>
	);
}

function MediaQueue({ roomId, user }: { roomId: string; user: UserStore }) {
	const { queue, queueMedia, dequeueMedia, sendMediaState } = useRoom(roomId, user.id, user.username);

	const inputRef = useRef<HTMLInputElement>(null);

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

	return (
		<div className="flex flex-col gap-2 min-[850px]:col-start-2">
			{/* Media Queue Input */}
			<InputGroup className="w-full">
				<InputGroupInput
					placeholder="Enter media url..."
					ref={inputRef}
					onKeyDown={(e) => {
						if (e.key === 'Enter') {
							queueSyncMedia();
						}
					}}
				/>
				<InputGroupAddon align="inline-end">
					<InputGroupButton
						aria-label="Add to Queue"
						title="Add to Queue"
						size="icon-xs"
						variant="secondary"
						onClick={queueSyncMedia}
					>
						<PlusSquareIcon />
					</InputGroupButton>
				</InputGroupAddon>
			</InputGroup>

			{/* Queue List */}
			<div className="flex flex-col gap-2">
				{queue.map((media) => (
					<Card
						key={media.id}
						className="flex justify-between items-center gap-1 text-left w-full py-1.5!"
					>
						<span>
							<a className="link" href={media.url}>
								{media.title}
							</a>
						</span>
						<span className="text-sm italic text-muted-foreground">
							added by {media.user.username}
						</span>
						<Button variant='ghost' onClick={() => dequeueSyncMedia(media.id)}>
							<TrashIcon className='text-destructive' />
						</Button>
					</Card>
				))}
			</div>
		</div>
	);
}

function MediaPlayer({ roomId, user }: { roomId: string; user: UserStore }) {
	const playerRef = useRef<HTMLVideoElement>(null);
	const { queue, mediaState, dequeueMedia, sendMediaState } = useRoom(
		roomId,
		user.id,
		user.username,
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
							playerRef.current?.currentTime,
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
		<div className="w-full flex flex-col items-center justify-center mt-24 mb-16 gap-8 text-center">
			<h1 className="font-header text-5xl">{room.name}</h1>

			<div className="grid grid-cols-1 min-[850px]:grid-cols-[40fr_60fr] gap-4 w-full max-w-[95vw]">
				{/* Media Player */}
				<MediaPlayer roomId={room.id} user={user} />

				{/* Queue */}
				<MediaQueue roomId={room.id} user={user} />

				{/* Chat message box */}
				<ChatBox roomId={room.id} user={user} />
			</div>
		</div>
	);
}
