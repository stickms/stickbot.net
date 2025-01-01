import { Flex, Text, Link } from '@radix-ui/themes';

function Root() {
  return (
    <Flex className='items-center justify-center h-full flex-col gap-y-24'>
      <Flex className='mt-[35vh] items-center justify-center'>
        <Text className='text-3xl'>Stickbot.net</Text>
      </Flex>
      <Flex className='mb-[20vh] items-center justify-center flex-col gap-y-4'>
        <Link href='/profile'>Steam Profile Lookup</Link>
        <Link href='/api-reference'>API & Reference</Link>
      </Flex>
    </Flex>
  );
}

export default Root;
