import { useEffect } from 'react';
import { AbsoluteCenter, Text } from '@chakra-ui/react';
import { useParams } from 'react-router-dom';

function OpenProfile() {
  const { id } = useParams();

  useEffect(() => {
    window.location.href = `steam://openurl/https://steamcommunity.com/profiles/${id}`;
  });

  return (
    <AbsoluteCenter>
      <Text fontSize='3xl'>Redirecting...</Text>
    </AbsoluteCenter>
  );
}

export default OpenProfile;
