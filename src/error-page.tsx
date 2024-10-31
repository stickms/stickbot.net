import { ErrorResponse, useRouteError } from 'react-router-dom';
import { Flex, Text } from '@radix-ui/themes';

function ErrorPage() {
  const error = useRouteError();

  return (
    <Flex className='items-center justify-center h-screen flex-col gap-y-4'>
      <Text className='text-3xl'>Error</Text>
      <Text className='text-lg'>
        {(error as ErrorResponse).statusText ||
          (error as Error).message ||
          'Unknown Error'}
      </Text>
    </Flex>
  );
}

export default ErrorPage;
