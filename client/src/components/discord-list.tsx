import { Avatar, Flex, Select, Text } from '@radix-ui/themes';
import { useEffect } from 'react';
import { clearGuildId, setGuildId } from '../lib/store';
import { useAuth } from '../hooks/use-auth';

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

  return (
    <Select.Root onValueChange={setGuildId}>
      <Select.Trigger className='w-56' placeholder={placeholder} />
      <Select.Content>
        <Select.Group>
          <Select.Label>{placeholder}</Select.Label>
          {guilds.map((guild) => (
            <Select.Item value={guild.id} key={guild.id}>
              <Flex className='gap-2 items-center justify-start'>
                <Avatar
                  src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`}
                  fallback={guild.name[0]}
                  size='1'
                />
                <Text className='max-w-72' truncate>
                  {guild.name}
                </Text>
              </Flex>
            </Select.Item>
          ))}
        </Select.Group>
      </Select.Content>
    </Select.Root>
  );
}

export default DiscordList;
