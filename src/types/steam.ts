export interface SteamProfileSummary {
	// GetPlayerSummary
	steamid: string;
	communityvisibilitystate: number;
	profilestate: number;
	personaname: string;
	commentpermission?: number;
	profileurl: string;
	avatar: string;
	avatarmedium: string;
	avatarfull: string;
	avatarhash: string;
	personastate: number;
	realname?: string;
	primaryclanid?: string;
	timecreated?: number;
	personastateflags: number;
	loccountrycode?: string;
	locstatecode?: string;
	loccityid?: number;
	gameid?: string;
	gameextrainfo?: string;
	gameserverip?: string;

	// GetPlayerBans
	CommunityBanned: boolean;
	VACBanned: boolean;
	NumberOfVACBans: number;
	DaysSinceLastBan: number;
	NumberOfGameBans: number;
	EconomyBan: string;
}

// Removed things we don't care about
export interface SDRConfigResult {
	revision: number;
	pops: Record<
		string,
		{
			desc: string;
			geo: [number, number];
			partners: number;
			tier: number;
			// No idea when this is not undefined, but seems to be when on VPS
			has_gameservers?: boolean;
			// We exclude null/undefined relays
			relays: {
				ipv4: string;
				port_range: [number, number];
			}[];
		}
	>;
}
