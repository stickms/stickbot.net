import { Avatar, Select } from "@radix-ui/themes";
import { useEffect } from "react";
import { clearGuildId, setGuildId } from "../lib/store";
import useAuth from "../hooks/use-auth";

function DiscordList() {
  const { guilds, getGuilds } = useAuth();

  useEffect(() => {
    clearGuildId();
    getGuilds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!guilds.length) {
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
            guilds.map((guild) => {
              return <Select.Item value={guild.id} key={guild.id}>
                <Avatar 
                  src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`}
                  fallback={guild.name[0]}
                  size='1'
                />
                {' ' + guild.name}
              </Select.Item>
            })
          }
        </Select.Group>
      </Select.Content>
    </Select.Root>
  );
}

export default DiscordList;
