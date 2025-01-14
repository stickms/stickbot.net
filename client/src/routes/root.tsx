import { Flex, Text, Link } from '@radix-ui/themes';
import { NavLink } from 'react-router-dom';

function Root() {
  return (
    <Flex className='items-center justify-center min-h-[30rem] h-screen flex-col gap-y-24'>
      <Flex className='items-center justify-center'>
        <Text className='text-3xl'>Stickbot.net</Text>
      </Flex>
      <Flex className='items-center justify-center flex-col gap-y-4'>
        <Link asChild>
          <NavLink to='/lookup'>Steam Profile Lookup</NavLink>
        </Link>
        <Link asChild>
          <NavLink to='/qr-code-generator'>QR Code Generator</NavLink>
        </Link>
        <Link asChild>
          <NavLink to='/soundcloud-dl'>Soundcloud Downloader</NavLink>
        </Link>
        <Link asChild>
          <NavLink to='/api-reference'>API & Reference</NavLink>
        </Link>
      </Flex>
    </Flex>
  );
}

export default Root;
