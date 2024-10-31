import { useEffect } from 'react';
import { Flex, Text } from '@radix-ui/themes';
import { useParams } from 'react-router-dom';

function OpenProfile() {
  const { id } = useParams();

  useEffect(() => {
    window.location.href = `steam://openurl/https://steamcommunity.com/profiles/${id}`
  }, [ id ]);

  return (
    <Flex className='items-center justify-center h-screen flex-col gap-y-4'>
      <Text className='text-3xl'>Redirecting...</Text>
    </Flex>
  );
}

export default OpenProfile;
