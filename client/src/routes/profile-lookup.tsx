import {
  Flex,
  Grid,
  IconButton,
  Link,
  ScrollArea,
  TextField
} from '@radix-ui/themes';
import { useState } from 'react';
import SteamProfile from '../components/steam-profile';
import { MagnifyingGlassIcon } from '@radix-ui/react-icons';

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
      <Flex className='items-center justify-center flex-col gap-y-24 mt-[20vh]'>
        <Link
          href='.'
          color='gray'
          highContrast
          underline='hover'
          className='text-3xl text-center'
        >
          Steam Profile Lookup
        </Link>
        <TextField.Root
          className='w-96 max-w-[80vw]'
          placeholder='Lookup a Steam Profile...'
          value={query}
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
      </Flex>
      <Flex className='items-center justify-center'>
        <ScrollArea
          scrollbars='vertical'
          className='w-[700px] max-w-[80vw] max-h-[40vh] pt-2'
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
