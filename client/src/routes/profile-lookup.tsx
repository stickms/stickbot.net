import {
  Flex,
  Grid,
  IconButton,
  ScrollArea,
  TextField,
  Text
} from '@radix-ui/themes';
import { useState } from 'react';
import SteamProfile from '../components/steam-profile';
import { MagnifyingGlassIcon } from '@radix-ui/react-icons';
import DiscordList from '../components/discord-list';

function ProfileLookup() {
  const [query, setQuery] = useState<string>('');
  const [disabled, setDisabled] = useState<boolean>(false);
  const [profiles, setProfiles] = useState<string[]>([]);

  const handleSearch = () => {
    if (query === '') {
      return;
    }

    setProfiles((prev) => [query, ...prev]);
    setQuery('');
    setDisabled(true);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.stopPropagation();
      handleSearch();
    }
  };

  return (
    <Grid className='grid-rows-2 grid-cols-1 w-screen h-screen'>
      <Flex className='items-center justify-center flex-col gap-y-20 mt-[16vh]'>
        <Text className='text-3xl'>
          Steam Profile Lookup
        </Text>
        <Flex className='flex-wrap gap-4 items-center justify-center'>
          <TextField.Root
            className='w-96 max-w-[80vw]'
            placeholder='Lookup a Steam Profile...'
            value={query}
            maxLength={128}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={disabled}
          >
            <TextField.Slot side='right'>
              <IconButton size='2' variant='ghost' onClick={() => handleSearch()}>
                <MagnifyingGlassIcon />
              </IconButton>
            </TextField.Slot>
          </TextField.Root>
          <DiscordList />
        </Flex>
      </Flex>
      <Flex className='items-center justify-center'>
        <ScrollArea
          scrollbars='vertical'
          className='w-[700px] max-w-[80vw] max-h-full pt-2'
        >
          <Flex className='items-center justify-center flex-col'>
            {profiles.map((p, i) => (
              <SteamProfile
                key={profiles.length - i}
                steamid={p}
                setDisabled={setDisabled}
              />
            ))}
          </Flex>
        </ScrollArea>
      </Flex>
    </Grid>
  );
}

export default ProfileLookup;
