import { createFileRoute, redirect } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { Card } from '~/components/card';
import { Input } from '~/components/ui/input';
import { ScrollArea } from '~/components/ui/scroll-area';
import { prisma } from '~/lib/prisma';
import { useRoom } from '~/lib/socket';
import { useUserStore } from '~/lib/stores';

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

function RouteComponent() {
	const room = Route.useLoaderData();
	const user = useUserStore();

	const { messages, sendMessage } = useRoom(room.id, user.id, user.username);

	return (
		<div className="w-full flex flex-col items-center justify-center mt-40 mb-8 gap-8 text-center">
			<h1 className="font-header text-6xl">Welcome to {room.name}!</h1>
			<Input
				className='w-96'
				onKeyDown={(e) => {
					if (e.currentTarget.value && e.key === 'Enter') {
						sendMessage(e.currentTarget.value);
						e.currentTarget.value = '';
					}
				}}
			/>
			<Card>
				<ScrollArea className='w-100 h-72'>
					<div className='flex flex-col items-start gap-1'>
						{messages.map((msg) => (
							<span key={`${msg.id}`}>{msg.user.username} : {msg.content}</span>
						))}
					</div>
				</ScrollArea>
			</Card>
		</div>
	);
}
