import { Flex, Text, Link } from '@radix-ui/themes';

function Root() {
  return (
    <Flex className='items-center justify-center min-h-[30rem] h-screen flex-col gap-y-24'>
      <Flex className='items-center justify-center'>
        <Text className='text-3xl'>Stickbot.net</Text>
      </Flex>
      <Flex className='items-center justify-center flex-col gap-y-4'>
        <Link href='/profile'>Steam Profile Lookup</Link>
        <Link href='/api-reference'>API & Reference</Link>
      </Flex>
    </Flex>
  );
}

export default Root;
