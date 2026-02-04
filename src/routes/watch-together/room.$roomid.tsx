import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { SendIcon } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Card } from '~/components/card';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '~/components/ui/input-group';
import { ScrollArea } from '~/components/ui/scroll-area';
import { prisma } from '~/lib/prisma';
import { useRoom } from '~/lib/socket';
import { useUserStore } from '~/lib/stores';

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
	ssr: false
});

function ChatBox() {
	const room = Route.useLoaderData();
	const user = useUserStore();

	const inputRef = useRef<HTMLInputElement>(null);
	const messagesEndRef = useRef<HTMLDivElement>(null);

	const { users, messages, sendMessage } = useRoom(room.id, user.id, user.username);

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
	}

	return (
		<div className='h-100 min-[850px]:h-auto min-[850px]:row-start-1 relative'>
			<Card className='chat-box absolute inset-0 overflow-hidden'>
				<ScrollArea className='chat-box-users size-full min-h-0' type='always'>
					<div className='flex flex-col w-full text-left gap-2'>
						{/* Only show unique users (people can open other tabs, etc.) */}
						{users
							.filter((u, index, arr) => index === arr.findIndex((e) => e.id === u.id))
							.map(({ id, username }) => (
								<span key={id}>{username}</span>
							))
						}
					</div>
				</ScrollArea>

				<ScrollArea className='chat-box-messages size-full min-h-0' type='always'>
					<div className='flex flex-col w-full text-left gap-2'>
						{messages.map(({ id, user, content }) => (
							<span key={id}>{user.username} : {content}</span>
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
							aria-label="Search"
							title="Search"
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

function RouteComponent() {
	const navigate = useNavigate();
	const room = Route.useLoaderData();
	const user = useUserStore();

	const { queue, queueMedia } = useRoom(room.id, user.id, user.username);

	if (!user.id) {
		navigate({ to: '/watch-together' });
		return null;
	}

	return (
		<div className="w-full flex flex-col items-center justify-center mt-24 mb-16 gap-8 text-center">
			<h1 className="font-header text-5xl">{room.name}</h1>

			<div className='grid grid-cols-1 min-[850px]:grid-cols-[40fr_60fr] gap-4 w-full max-w-[95vw]'>
				{/* Media Player */}
				<Card className='aspect-video min-[850px]:col-start-2 min-[850px]:row-start-1'>

				</Card>

				{/* Queue */}
				<div className='min-[850px]:col-start-2'>
					queue elements here
				</div>

				{/* Chat message box */}
				<ChatBox />
			</div>
		</div>
	);
}
