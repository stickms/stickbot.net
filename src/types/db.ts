interface PlayerTag {
	addedby: string;
	date: number;
}

export interface DatabasePlayerEntry {
	_id: string;
	addresses: {
		[ip: string]: {
			game: string;
			date: number;
		};
	};
	bandata: {
		vacbans: number;
		gamebans: number;
		communityban: boolean;
		tradeban: boolean;
	};
	names: {
		[name: string]: number;
	};
	notifications: {
		[guildid: string]: {
			ban: string[];
			name: string[];
			log: string[];
		};
	};
	tags: {
		[guildid: string]: {
			cheater?: PlayerTag;
			suspicious?: PlayerTag;
			popular?: PlayerTag;
			banwatch?: PlayerTag;
		};
	};
}
