import { useStore } from "@nanostores/react";
import { Avatar, Button, DropdownMenu, Flex, Link } from "@radix-ui/themes";
import { $user, clearGuildId, clearGuilds, clearUser, setUser } from "../lib/store";
import { DiscordLogoIcon } from "@radix-ui/react-icons";
import { API_ENDPOINT } from "../env";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

function DiscordLogin() {
  const user = useStore($user);
  const location = useLocation();

  useEffect(() => {
    fetch(`${API_ENDPOINT}/discord/user`, { credentials: 'include' })
      .then((res) => {
        res.json()
          .then((json) => {
            setUser(json['user']);
          })
          .catch(() => {
            clearUser();
          })
      })
      .catch(() => {
        clearUser();
      })
  }, [ user?.id ]);

  const handleLogout = () => {
    fetch(`${API_ENDPOINT}/logout/discord`, {
      method: 'POST',
      credentials: 'include'
    }).then(() => {
      clearUser();
      clearGuilds();
      clearGuildId();
    });
  }

  if (!user?.id) {
    const redirect = `?redirect=${encodeURIComponent(location.pathname)}`;
    return (
      <Link href={`${API_ENDPOINT}/login/discord${redirect}`}>
        <Button className='cursor-pointer'>
          <DiscordLogoIcon /> Login
        </Button>
      </Link>
    );
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <Button variant='ghost' className='cursor-pointer'>
          <Avatar src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`} fallback='U' size='2' />
          <DropdownMenu.TriggerIcon /> 
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        <DropdownMenu.Label>
          {user.username}
        </DropdownMenu.Label>
        <DropdownMenu.Item onClick={handleLogout} className='cursor-pointer'>
          Logout
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}

function Header() {
  return (
    <Flex className='fixed top-0 w-full justify-between items-center'>
      {/* Left */}
      <Flex className='pl-6 py-2'>
        <Link href='/' color='gray' highContrast underline='hover'>
          Stickbot.net
        </Link>
      </Flex>

      {/* Right */}
      <Flex className='pr-6 py-2'>
        <DiscordLogin />
      </Flex>
    </Flex>
  );
}

export default Header;
