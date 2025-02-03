import { useEffect } from 'react';
import { AbsoluteCenter, Text } from '@chakra-ui/react';
import { useParams } from 'react-router-dom';
import { API_ENDPOINT } from '../env';

function OpenUrl() {
  const { id } = useParams();

  useEffect(() => {
    window.location.href = `${API_ENDPOINT}/tools/url/${id}`;
  });

  return (
    <AbsoluteCenter>
      <Text fontSize='3xl'>Redirecting...</Text>
    </AbsoluteCenter>
  );
}

export default OpenUrl;
