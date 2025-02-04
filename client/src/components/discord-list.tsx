import { createListCollection, HStack } from '@chakra-ui/react';
import { SelectContent, SelectItem, SelectRoot, SelectTrigger, SelectValueText } from '@/components/ui/select';
import { Avatar } from '@/components/ui/avatar';
import { useEffect } from 'react';
import { clearGuildId, setGuildId } from '../lib/store';
import useAuth from '../hooks/use-auth';

function DiscordList({ placeholder }: { placeholder: string }) {
  const { guilds, getGuilds } = useAuth();

  useEffect(() => {
    clearGuildId();
    getGuilds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!guilds.length) {
    return null;
  }

  const guildcollection = createListCollection({
    items: guilds.map((guild) => ({
      name: guild.name, 
      id: guild.id,
      icon: guild.icon
    })),
    itemToString: (item) => item.name,
    itemToValue: (item) => item.id
  });

  return (
    <SelectRoot
      collection={guildcollection}
      onValueChange={(e) => setGuildId(e.value[0] ?? '')}
      w='56'
    >
      <SelectTrigger clearable>
        <SelectValueText placeholder={placeholder}>
        {(guilds: { name: string; id: string; icon: string; }[]) => (
          <HStack>
            <Avatar
              shape='rounded'
              name={guilds[0].name[0]}
              src={`https://cdn.discordapp.com/icons/${guilds[0].id}/${guilds[0].icon}.png`}
              size='2xs'
            />
            {guilds[0].name}
          </HStack>
        )}
        </SelectValueText>
      </SelectTrigger>
      <SelectContent>
        {guildcollection.items.map((guild) => (
          <SelectItem item={guild} key={guild.id}>
            <HStack>
              <Avatar
                shape='rounded'
                name={guild.name[0]}
                src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`}
                size='2xs'
              />
              {guild.name}
            </HStack>
          </SelectItem>
        ))}
      </SelectContent>
    </SelectRoot>
  );
}

export default DiscordList;
