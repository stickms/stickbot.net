import { useStore } from "@nanostores/react";
import { Avatar, Button, DropdownMenu, Flex, Link } from "@radix-ui/themes";
import { $user, clearGuildId, clearGuilds, clearUser, setGuilds, setUser } from "../lib/store";
import { DiscordLogoIcon } from "@radix-ui/react-icons";
import { API_ENDPOINT } from "../env";
import { useEffect } from "react";

function DiscordLogin() {
  const user = useStore($user);

  useEffect(() => {
    fetch(`${API_ENDPOINT}/discord_info`, { credentials: 'include' })
      .then((res) => {
        res.json()
          .then((json) => {
            setUser(json['user']);
            setGuilds(json['guilds']);
          })
          .catch(() => {
            clearUser();
            clearGuilds();    
          })
      })
      .catch(() => {
        clearUser();
        clearGuilds();
      })
  }, []);

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
    return (
      <Link href={`${API_ENDPOINT}/login/discord`}>
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
