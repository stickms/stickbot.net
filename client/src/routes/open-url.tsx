import { useEffect } from 'react';
import { Flex, Text } from '@radix-ui/themes';
import { useParams } from 'react-router-dom';
import { API_ENDPOINT } from '../env';

function OpenUrl() {
  const { id } = useParams();

  useEffect(() => {
    window.location.href = `${API_ENDPOINT}/tools/url/${id}`;
  });

  return (
    <Flex className='items-center justify-center h-screen flex-col gap-y-4'>
      <Text className='text-3xl'>Redirecting...</Text>
    </Flex>
  );
}

export default OpenUrl;
