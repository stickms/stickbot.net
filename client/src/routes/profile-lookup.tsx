import {
  Flex,
  IconButton,
  TextField,
  Text
} from '@radix-ui/themes';
import { useState } from 'react';
import SteamProfile from '../components/steam-profile';
import { MagnifyingGlassIcon } from '@radix-ui/react-icons';
import DiscordList from '../components/discord-list';
import useToast from '../hooks/use-toast';

function ProfileLookup() {
  const { toast } = useToast();

  const [query, setQuery] = useState<string>('');
  const [disabled, setDisabled] = useState<boolean>(false);
  const [profiles, setProfiles] = useState<string[]>([]);

  const handleSearch = () => {
    if (query === '') {
      toast({
        title: 'Error: Could not lookup profile',
        description: 'Please enter a Steam ID or profile URL'
      });
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
    <Flex className='flex-col items-center gap-y-20 min-h-screen'>
      <Text className='mt-40 text-3xl text-center'>Steam Profile Lookup</Text>
      <Flex className='flex-wrap gap-4 items-center justify-center max-w-[80vw]'>
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
            <IconButton variant='ghost' onClick={handleSearch}>
              <MagnifyingGlassIcon />
            </IconButton>
          </TextField.Slot>
        </TextField.Root>
        <DiscordList />
      </Flex>
      <Flex className='items-center justify-center flex-col mb-4 max-w-[80vw]'>
        {!profiles.length && <SteamProfile skeleton />}
        {profiles.map((p, i) => {
          return i >= 5 ? null : (
            <SteamProfile
              key={profiles.length - i}
              steamid={p}
              setDisabled={setDisabled}
            />
          );
        })}
      </Flex>
    </Flex>
  );
}

export default ProfileLookup;
