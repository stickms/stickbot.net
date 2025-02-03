import { AbsoluteCenter, Link, Text, VStack } from '@chakra-ui/react';
import { NavLink } from 'react-router-dom';

function Root() {
  return (
    <AbsoluteCenter axis='both'>
      <VStack gap='4'>
        <Text fontSize='3xl' mb='20' colorPalette='gray'>Stickbot.net</Text>

        <Link asChild>
          <NavLink to='/watch-together'>Watch Together</NavLink>
        </Link>
        <Link asChild>
          <NavLink to='/lookup'>Steam Profile Lookup</NavLink>
        </Link>
        <Link asChild>
          <NavLink to='/youtube-dl'>YouTube Downloader</NavLink>
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

      </VStack>
    </AbsoluteCenter>
  );
}

export default Root;
