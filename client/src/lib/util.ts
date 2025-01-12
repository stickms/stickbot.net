export function fetchGetJson(resp: Response) {
  if (!resp.ok) {
    throw new Error(resp.statusText);
  }

  return resp.json();
}

export function getDiscordAvatar(userid: string, avatar?: string) {
  const cdn = 'https://cdn.discordapp.com/';

  if (!avatar) {
    return `${cdn}/embed/avatars/${(BigInt(userid) >> 22n) % 6n}.png`;
  }

  return `${cdn}/avatars/${userid}/${avatar}.png`;
}
