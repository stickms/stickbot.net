import { Avatar, Select } from "@radix-ui/themes";
import { useEffect } from "react";
import { API_ENDPOINT } from "../env";
import { useStore } from '@nanostores/react';
import { $guilds, $user, clearGuildId, clearGuilds, setGuildId, setGuilds } from "../lib/store";

function DiscordList() {
  const user = useStore($user);
  const guilds = useStore($guilds);

  useEffect(() => {
    clearGuildId();

    fetch(`${API_ENDPOINT}/discord/guilds`, { credentials: 'include' })
      .then((res) => {
        res.json()
          .then((json) => {
            setGuilds(json['guilds']);
          })
          .catch(() => {
            clearGuilds();    
          })
      })
      .catch(() => {
        clearGuilds();
      })
  }, []);

  if (!user?.id) {
    return null;
  }

  return (
    <Select.Root onValueChange={setGuildId}>
      <Select.Trigger placeholder='Search by Server' />
      <Select.Content>
        <Select.Group>
          <Select.Label>
            Search by Server
          </Select.Label>
          {
            guilds.length > 0 && guilds.map((guild) => {
              return <Select.Item value={guild.id} id={guild.id} key={guild.id}>
                <Avatar src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`} fallback='S' size='1' />
                {' '}{guild.name}
              </Select.Item>
            })
          }
        </Select.Group>
      </Select.Content>
    </Select.Root>
  );
}

export default DiscordList;
