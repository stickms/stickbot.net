import { Flex, IconButton, TextField, Text } from '@radix-ui/themes';
import { useEffect, useRef, useState } from 'react';
import SteamProfile from '../components/steam-profile';
import { MagnifyingGlassIcon } from '@radix-ui/react-icons';
import DiscordList from '../components/discord-list';
import { useToast } from '../hooks/use-toast';
import { TypeAnimation } from 'react-type-animation';

function ProfileLookup() {
  const { toast } = useToast();

  const input = useRef<HTMLInputElement>(null);
  const [disabled, setDisabled] = useState<boolean>(false);
  const [profiles, setProfiles] = useState<string[]>([]);

  useEffect(() => {
    if (!disabled && input.current) {
      input.current.value = '';
    }
  }, [disabled]);

  const handleSearch = () => {
    if (!input.current?.value.trim()) {
      toast({
        title: 'Error: Could not lookup profile',
        description: 'Please enter a Steam ID or profile URL'
      });
      return;
    }

    setProfiles((prev) => [input.current!.value.trim(), ...prev]);
    setDisabled(true);
  };

  return (
    <Flex className='flex-col items-center gap-y-20 min-h-screen pt-40 pb-16'>
      <Text className='text-3xl text-center font-[Bipolar] h-8'>
        <TypeAnimation
          sequence={[100, 'STEAM PROFILE LOOKUP']}
          cursor={false}
        />
      </Text>
      <Flex className='flex-wrap gap-4 items-center justify-center max-w-[80vw]'>
        <TextField.Root
          ref={input}
          className='w-96 max-w-[80vw]'
          placeholder='Lookup a Steam Profile...'
          maxLength={128}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          disabled={disabled}
        >
          <TextField.Slot side='right'>
            <IconButton variant='ghost' onClick={handleSearch}>
              <MagnifyingGlassIcon />
            </IconButton>
          </TextField.Slot>
        </TextField.Root>
        <DiscordList placeholder='Search by server' />
      </Flex>
      <Flex className='items-center justify-center flex-col'>
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
