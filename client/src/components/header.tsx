import { Button, IconButton, Link, Box, HStack } from '@chakra-ui/react';
import { MenuRoot, MenuTrigger, MenuContent, MenuSeparator, MenuItem } from '@/components/ui/menu';
import { useColorMode } from '@/components/ui/color-mode';
import { API_ENDPOINT } from '../env';
import { useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/use-auth';
import { getDiscordAvatar } from '../lib/util';
import { Avatar } from '@/components/ui/avatar';
import { FaDiscord, FaGithub } from 'react-icons/fa';
import { RxCaretDown } from 'react-icons/rx';
import { LuMoon, LuSun } from 'react-icons/lu';

function DiscordLogin() {
  const { user, getUser, validateAdmin, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    getUser();
    validateAdmin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!user.id) {
    const redirect = `?redirect=${encodeURIComponent(location.pathname)}`;
    return (
      <Link href={`${API_ENDPOINT}/login/discord${redirect}`}>
        <Button>
          <FaDiscord /> Login
        </Button>
      </Link>
    );
  }

  return (
    <MenuRoot>
      <MenuTrigger asChild>
        <Button variant='ghost' size='md'>
          <Avatar
            shape='rounded'
            src={getDiscordAvatar(user.discord_id, user.avatar)}
            fallback={'U'}
          />
          <RxCaretDown />
        </Button>
      </MenuTrigger>
      <MenuContent>
        <MenuItem value='username' disabled>{user.username}</MenuItem>
        <MenuSeparator />
        {user.is_admin && (
          <MenuItem
            value='admin-portal'
            onClick={() => navigate('/admin-portal')}
          >
            Admin Portal
          </MenuItem>
        )}
        <MenuItem value='logout' onClick={logout} color='red.400'>
          Logout
        </MenuItem>
      </MenuContent>    
    </MenuRoot>   
  );
}

function Header() {
  const { colorMode, toggleColorMode } = useColorMode();
  
  return (
    <Box pos='fixed' top='0' left='0' w='100vw' h='16' px='6' zIndex='1' backdropBlur='3xl' bgColor='Background' borderWidth='1px'>
      <HStack h='full' justify='space-between'>
        {/* Left */}
        <Link color='fg' asChild>
          <NavLink to='/'>Stickbot.net</NavLink>
        </Link>

        {/* Right */}
        <HStack>
          <IconButton variant='outline' onClick={toggleColorMode}>
            {colorMode === 'light' ? <LuMoon /> : <LuSun />}
          </IconButton>
          <IconButton variant='outline' asChild>
            <Link
            href='https://github.com/stickms/stickbot.net'
            target='_blank'
            rel='noopener noreferrer'
          >
            <FaGithub />
          </Link>
          </IconButton>
          <DiscordLogin />
        </HStack>
      </HStack>
    </Box>
  );
}

export default Header;
