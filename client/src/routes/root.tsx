import { Flex, Text, Link } from '@radix-ui/themes';

function Root() {
  return (
    <Flex className='items-center justify-center h-screen flex-col gap-y-24'>
      <Flex className='items-center justify-center'>
        <Text className='text-3xl'>Stickbot.net</Text>
      </Flex>
      <Flex className='items-center justify-center flex-col gap-y-4 h-[15vh]'>
        <Link href='/profile'>Steam Profile Lookup</Link>
        <Link href='https://boba.alexwu.monster'>boba.alexwu.monster</Link>
      </Flex>
    </Flex>
  );
}

export default Root;
