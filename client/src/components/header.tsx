import { Avatar, Button, DropdownMenu, Flex, Link } from '@radix-ui/themes';
import { DiscordLogoIcon } from '@radix-ui/react-icons';
import { API_ENDPOINT } from '../env';
import { useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/use-auth';
import { getDiscordAvatar } from '../lib/util';

function DiscordLogin() {
  const { user, admin, getUser, validateAdmin, logout } = useAuth();
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
            src={getDiscordAvatar(user.id, user.avatar)}
            fallback={'U'}
            size='2'
          />
          <DropdownMenu.TriggerIcon />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        <DropdownMenu.Label>{user.username}</DropdownMenu.Label>
        <DropdownMenu.Separator />
        {admin && (
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
  return (
    <Flex className='fixed top-0 w-full justify-between items-center z-50 bg-inherit'>
      {/* Left */}
      <Flex className='pl-6 py-4'>
        <Link asChild color='gray' highContrast underline='hover'>
          <NavLink to='/'>Stickbot.net</NavLink>
        </Link>
      </Flex>

      {/* Right */}
      <Flex className='pr-6 py-4'>
        <DiscordLogin />
      </Flex>
    </Flex>
  );
}

export default Header;
