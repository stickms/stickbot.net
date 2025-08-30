import { Flex, Text, Link } from '@radix-ui/themes';
import { NavLink } from 'react-router-dom';
import { TypeAnimation } from 'react-type-animation';

function Root() {
  return (
    <Flex className='items-center justify-center min-h-screen pt-32 pb-16'>
      <Flex className='items-center justify-center flex-col gap-y-4'>
        <Text className='text-3xl mb-20 font-[Bipolar] h-8'>
          <TypeAnimation sequence={[100, 'STICKBOT.NET']} cursor={false} />
        </Text>
        <Link asChild>
          <NavLink to='/watch-together'>Watch Together</NavLink>
        </Link>
        <Link asChild>
          <NavLink to='/lookup'>Steam Profile Lookup</NavLink>
        </Link>
        <Link asChild>
          <NavLink to='/region-select'>TF2/CS2 Region Selector</NavLink>
        </Link>
        <Link asChild>
          <NavLink to='/soundcloud-dl'>Soundcloud Downloader</NavLink>
        </Link>
        <Link asChild>
          <NavLink to='/url-shortener'>URL Shortener</NavLink>
        </Link>
        <Link asChild>
          <NavLink to='/qr-code-generator'>QR Code Generator</NavLink>
        </Link>
        <Link asChild>
          <NavLink to='/api-reference'>API & Reference</NavLink>
        </Link>
      </Flex>
    </Flex>
  );
}

export default Root;
