import { useParams } from 'react-router-dom';
import { Flex, Text } from '@radix-ui/themes';

function SteamProfile() {
  const { steamid } = useParams();

  return (
    <Flex className='justify-center items-center h-screen'>
      <Text className='text-3xl'>Profile: {steamid}</Text>
    </Flex>
  );
}

export default SteamProfile;
