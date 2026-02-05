import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserStore = {
	id: string | null;
	username: string | null;
	setId: (arg: string | null) => void;
	setUsername: (arg: string | null) => void;
};

export const useUserStore = create<UserStore>()(
	persist(
		(set, _get) => ({
			id: null,
			username: null,
			setId: (_id) => set({ id: _id }),
			setUsername: (_username) => set({ username: _username })
		}),
		{
			name: 'sync-user'
		}
	)
);
