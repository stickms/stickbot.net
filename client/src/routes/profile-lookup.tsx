import { HStack, IconButton, Input, Text, VStack } from '@chakra-ui/react';
import { useEffect, useRef, useState } from 'react';
import SteamProfile from '../components/steam-profile';
import DiscordList from '../components/discord-list';
import { toaster } from '@/components/ui/toaster';
import { InputGroup } from '@/components/ui/input-group';
import { FaMagnifyingGlass } from 'react-icons/fa6';

function ProfileLookup() {
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
      toaster.create({
        title: 'Error: Could not lookup profile',
        description: 'Please enter a Steam ID or profile URL'
      });
      return;
    }

    setProfiles((prev) => [ input.current!.value.trim(), ...prev ]);
    setDisabled(true);
  };

  return (
    <VStack gap='20' pt='40' pb='8'>
      <Text fontSize='3xl' textAlign='center'>Steam Profile Lookup</Text>
      <HStack justify='center' maxW='80vw' flexWrap='wrap'>
        <InputGroup
          endElement={(
            <IconButton
              onClick={handleSearch}
              size='xs'
              me='-2'
              variant='ghost'
              loading={disabled}
            >
              <FaMagnifyingGlass />
            </IconButton>
          )}
        >
          <Input
            ref={input}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder='Enter Steam ID or Custom URL...'
            w='96'
            maxW='80vw'
          />
        </InputGroup>
        <DiscordList placeholder='Search by server...' />
      </HStack>

      <VStack>
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
      </VStack>
    </VStack>
  );
}

export default ProfileLookup;
