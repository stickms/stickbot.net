import { Avatar, Select, Text } from "@radix-ui/themes";
import { useEffect } from "react";
import { clearGuildId, setGuildId } from "../lib/store";
import useAuth from "../hooks/use-auth";

function DiscordList({ placeholder }: { placeholder?: string }) {
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
      <Select.Trigger className='w-56' placeholder={placeholder ?? 'Search by Server'} />
      <Select.Content>
        <Select.Group>
          <Select.Label>
            {placeholder ?? 'Search by Server'}
          </Select.Label>
          {
            guilds.map((guild) => {
              return (
                <Select.Item value={guild.id} key={guild.id}>
                  <Avatar 
                    src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`}
                    fallback={guild.name[0]}
                    size='1'
                  />
                  <Text className='pl-2'>{guild.name}</Text>
                </Select.Item>
              )
            })
          }
        </Select.Group>
      </Select.Content>
    </Select.Root>
  );
}

export default DiscordList;
