import {
  Avatar,
  Button,
  DropdownMenu,
  Flex,
  IconButton,
  Link
} from '@radix-ui/themes';
import {
  DiscordLogoIcon,
  GitHubLogoIcon,
  MoonIcon,
  SunIcon
} from '@radix-ui/react-icons';
import { API_ENDPOINT } from '../env';
import { useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/use-auth';
import { getDiscordAvatar } from '../lib/util';
import { useTheme } from 'next-themes';

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
          <DiscordLogoIcon /> Login
        </Button>
      </Link>
    );
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <Button variant='ghost'>
          <Avatar
            src={getDiscordAvatar(user.discord_id, user.avatar)}
            fallback={'U'}
            size='2'
          />
          <DropdownMenu.TriggerIcon />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        <DropdownMenu.Label>{user.username}</DropdownMenu.Label>
        <DropdownMenu.Separator />
        {user.is_admin && (
          <DropdownMenu.Item onClick={() => navigate('/admin-portal')}>
            Admin Portal
          </DropdownMenu.Item>
        )}
        <DropdownMenu.Item onClick={logout} color='red'>
          Logout
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}

function Header() {
  const location = useLocation();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <Flex className='fixed top-0 w-full px-6 h-16 justify-between items-center z-50 backdrop-blur-[8px] md:backdrop-blur-none'>
      {/* Left */}
      <Flex className='items-center'>
        <Link asChild color='gray' highContrast underline='hover'>
          <NavLink to='/'>Stickbot.net</NavLink>
        </Link>
      </Flex>

      {/* Right */}
      <Flex className='gap-4 items-center'>
        <IconButton
          variant='surface'
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        >
          {theme === 'dark' && <SunIcon />}
          {theme !== 'dark' && <MoonIcon />}
        </IconButton>
        <Link
          href='https://github.com/stickms/stickbot.net'
          target='_blank'
          rel='noopener noreferrer'
        >
          <IconButton variant='surface'>
            <GitHubLogoIcon />
          </IconButton>
        </Link>
        <DiscordLogin />
      </Flex>
    </Flex>
  );
}

export default Header;
