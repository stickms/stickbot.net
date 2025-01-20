export function fetchGetJson(resp: Response) {
  if (!resp.ok) {
    throw new Error(resp.statusText);
  }

  return resp.json();
}

export function parseSteamID(steamid: string) {
  let matches: RegExpMatchArray | null = null;

  // Steam Community ID 64
  if (steamid.match(/^\d+$/)) {
    return steamid;
  }

  if ((matches = steamid.match(/^STEAM_([0-1]):([0-1]):([0-9]+)$/))) {
    const accountid = parseInt(matches[3], 10) * 2 + parseInt(matches[2], 10);
    return `${(1n << 56n) | (1n << 52n) | (1n << 32n) | BigInt(accountid)}`;
  }

  if ((matches = steamid.match(/^\[U:1:([0-9]+)]$/))) {
    const accountid = parseInt(matches[1]);
    return `${(1n << 56n) | (1n << 52n) | (1n << 32n) | BigInt(accountid)}`;
  }

  throw new Error(`Could not parse Steam ID '${steamid}'`);
}

export function getDiscordAvatar(userid?: string, avatar?: string) {
  if (!userid) {
    return undefined;
  }

  const cdn = 'https://cdn.discordapp.com/';

  if (!avatar) {
    return `${cdn}/embed/avatars/${(BigInt(userid) >> 22n) % 6n}.png`;
  }

  return `${cdn}/avatars/${userid}/${avatar}.png`;
}
