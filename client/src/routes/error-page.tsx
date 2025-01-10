import { Flex, Text } from '@radix-ui/themes';

function ErrorPage() {
  return (
    <Flex className='items-center justify-center h-screen flex-col gap-y-4'>
      <Text className='text-3xl'>Error</Text>
      <Text className='text-lg'>
        Page not found
      </Text>
    </Flex>
  );
}

export default ErrorPage;
