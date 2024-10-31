import { Container, Flex, Grid, Text, TextField } from '@radix-ui/themes';
import { useState } from 'react';
import SteamProfile from '../components/steam-profile';

function ProfileLookup() {
  const [ query, setQuery ] = useState<string>('');
  const [ profiles, setProfiles ] = useState<string[]>([])
  
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.stopPropagation();
      setProfiles((prev) => [ query, ...prev ]);
      setQuery('');
    }
  }

  return (
    <Grid className='grid-rows-2 grid-cols-1 w-screen h-screen'>
      <Flex className='items-center justify-center flex-col gap-y-24 mt-[20vh]'>
        <Text className='text-3xl'>Steam Profile Lookup</Text>
        <TextField.Root
            className='w-96 max-w-[80vw]'
            placeholder='Lookup a Steam Profile...'
            value={query}
            onChange={ (e) => setQuery(e.target.value) }
            onKeyDown={handleKeyPress}
        />
      </Flex>
      <Flex className='items-center justify-center w-full h-full'>
        <Container className='w-96 max-w-[80vw]'>
          <Flex className='items-center justify-center flex-col gap-y-5 w-full max-h-[30vh] overflow-y-auto pt-2'>
            { 
              profiles.map((p) => (
                <SteamProfile steamid={p} />
              )) 
            }
          </Flex>
        </Container>
      </Flex>
    </Grid>
  );
}

export default ProfileLookup;
