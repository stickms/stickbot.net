import { randomBytes } from 'node:crypto';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { LoaderCircle, LogInIcon, SquarePlus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { SyncRoom, SyncUser } from '~/.generated/prisma/client';
import { Card } from '~/components/card';
import { Button } from '~/components/ui/button';
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from '~/components/ui/field';
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from '~/components/ui/input-group';
import { prisma } from '~/lib/prisma';
import { useUserStore } from '~/lib/stores';

const createUser = createServerFn({ method: 'POST' })
	.inputValidator((data: { username: string }) => data)
	.handler(async ({ data }) => {
		const { username } = data;

		const user = await prisma.syncUser.create({
			data: {
				username,
			},
		});

		return user;
	});

const createRoom = createServerFn({ method: 'POST' })
	.inputValidator((data: { name: string; userId: string }) => data)
	.handler(async ({ data }) => {
		const { name, userId } = data;

		const id = randomBytes(12).toString('hex').slice(12);

		const room = await prisma.syncRoom.create({
			data: {
				id,
				name,
				ownerId: userId,
			},
		});

		return {
			roomid: room.id,
		};
	});

const deleteRoom = createServerFn({ method: 'POST' })
	.inputValidator((data: { roomid: string }) => data)
	.handler(async ({ data }) => {
		await prisma.syncRoom.delete({
			where: {
				id: data.roomid,
			},
		});
	});

const getRooms = createServerFn().handler(async () => {
	return await prisma.syncRoom.findMany({ include: { owner: true } });
});

export const Route = createFileRoute('/watch-together/')({
	component: RouteComponent,
	ssr: false,
});

function LogIn() {
	const { setId, setUsername } = useUserStore();
	const inputRef = useRef<HTMLInputElement>(null);

	const login = () => {
		if (!inputRef.current?.value) {
			return;
		}

		createUser({ data: { username: inputRef.current.value } }).then((user) => {
			setId(user.id);
			setUsername(user.username);
		});
	};

	return (
		<Field className="w-80 max-w-[90vw]">
			<FieldLabel htmlFor="username">Username</FieldLabel>
			<InputGroup className="w-96">
				<InputGroupInput
					id="username"
					ref={inputRef}
					onKeyDown={(e) => {
						if (e.key === 'Enter') {
							login();
						}
					}}
				/>
				<InputGroupAddon align="inline-end">
					<InputGroupButton
						aria-label="Login"
						title="Login"
						size="icon-xs"
						variant="secondary"
						onClick={login}
					>
						<LogInIcon />
					</InputGroupButton>
				</InputGroupAddon>
			</InputGroup>
			<FieldDescription className="text-left">
				Enter a username to create or browse rooms!
			</FieldDescription>
		</Field>
	);
}

function RoomCreation() {
	const user = useUserStore();
	const navigate = useNavigate();

	const inputRef = useRef<HTMLInputElement>(null);
	const [createError, setCreateError] = useState<string>();

	const create = () => {
		setCreateError(undefined);

		if (!user.id) {
			setCreateError('please log in first');
			return;
		}

		if (!inputRef.current?.value) {
			setCreateError('please enter a name');
			return;
		}

		createRoom({
			data: {
				name: inputRef.current.value,
				userId: user.id,
			},
		})
			.then(({ roomid }) =>
				navigate({ to: '/watch-together/room/$roomid', params: { roomid } }),
			)
			.catch((error) => setCreateError(error.toString()));
	};

	return (
		<Field className="w-96 max-w-[90vw]">
			<FieldLabel>Create a room</FieldLabel>
			<InputGroup aria-invalid={!!createError}>
				<InputGroupInput
					id="username"
					ref={inputRef}
					aria-invalid={!!createError}
					maxLength={64}
					onKeyDown={(e) => {
						if (e.key === 'Enter') {
							create();
						}
					}}
				/>
				<InputGroupAddon align="inline-end">
					<InputGroupButton
						aria-label="Login"
						title="Login"
						size="icon-xs"
						variant="secondary"
						onClick={create}
					>
						<SquarePlus />
					</InputGroupButton>
				</InputGroupAddon>
			</InputGroup>
			{createError && <FieldError>{createError}</FieldError>}
		</Field>
	);
}

function RoomList() {
	const user = useUserStore();
	const navigate = useNavigate();
	const [rooms, setRooms] = useState<(SyncRoom & { owner: SyncUser })[]>();

	useEffect(() => {
		getRooms()
			.then(setRooms)
			.catch(() => setRooms([]));
	}, []);

	if (!rooms) {
		return (
			<span className="flex gap-2">
				<LoaderCircle className="animate-spin" /> Loading...
			</span>
		);
	}

	if (!rooms.length) {
		return <span>No rooms available. Create one to get started!</span>;
	}

	return (
		<div className="flex flex-wrap w-200 max-w-[90vw] justify-center items-stretch gap-4">
			{rooms.map((room) => (
				<Card
					key={room.id}
					className="min-w-56 min-h-56 flex flex-col items-start justify-between gap-4"
				>
					<div className="flex flex-col text-left gap-2">
						<span>{room.name}</span>
						<span className="text-muted-foreground">
							by: {room.owner.username}
						</span>
					</div>
					<div className="flex gap-2 ml-auto">
						{room.owner.id === user.id && (
							<Button
								variant="destructive"
								onClick={() => {
									deleteRoom({ data: { roomid: room.id } }).then(() =>
										setRooms(rooms.filter((rm) => room.id !== rm.id)),
									);
								}}
							>
								Close
							</Button>
						)}
						<Button
							onClick={() =>
								navigate({
									to: '/watch-together/room/$roomid',
									params: { roomid: room.id },
								})
							}
						>
							Join
						</Button>
					</div>
				</Card>
			))}
		</div>
	);
}

function RouteComponent() {
	const user = useUserStore();

	const logout = () => {
		user.setId(null);
	};

	return (
		<div className="w-full flex flex-col items-center justify-center mt-40 mb-16 gap-8 text-center">
			<h1 className="font-header text-6xl">watch together</h1>
			{!user.id && <LogIn />}
			{user.id && (
				<div className="flex flex-col items-center gap-8">
					<div className="flex flex-col items-center gap-4">
						<span>Welcome, {user.username}!</span>
						<Button variant="secondary" className="w-30" onClick={logout}>
							Logout
						</Button>
					</div>
					<RoomCreation />
					<RoomList />
				</div>
			)}
		</div>
	);
}
