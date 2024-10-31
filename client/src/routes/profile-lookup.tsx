import { Flex, Grid, ScrollArea, Text, TextField } from '@radix-ui/themes';
import { useState } from 'react';
import SteamProfile from '../components/steam-profile';

function ProfileLookup() {
  const [query, setQuery] = useState<string>('');
  const [disabled, setDisabled] = useState<boolean>(false);
  const [profiles, setProfiles] = useState<string[]>([]);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.stopPropagation();
      setProfiles((prev) => [query, ...prev]);
      setQuery('');
      setDisabled(true);
    }
  };

  return (
    <Grid className='grid-rows-2 grid-cols-1 w-screen h-screen'>
      <Flex className='items-center justify-center flex-col gap-y-24 mt-[20vh]'>
        <Text className='text-3xl text-center'>Steam Profile Lookup</Text>
        <TextField.Root
          className='w-96 max-w-[80vw]'
          placeholder='Lookup a Steam Profile...'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyPress}
          disabled={disabled}
        />
      </Flex>
      <Flex className='items-center justify-center'>
        <ScrollArea
          scrollbars='vertical'
          className='w-auto max-w-[80vw] max-h-[40vh]'
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
