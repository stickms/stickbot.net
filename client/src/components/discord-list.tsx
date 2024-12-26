import { Avatar, Button, DropdownMenu, Flex, Link, Select } from "@radix-ui/themes";
import { useEffect } from "react";
import { API_ENDPOINT } from "../env";
import { DiscordLogoIcon } from "@radix-ui/react-icons";
import { useStore } from '@nanostores/react';
import { $guilds, $user, clearGuildId, clearGuilds, clearUser, setGuildId, setGuilds, setUser } from "../lib/store";

function DiscordList() {
  const user = useStore($user);
  const guilds = useStore($guilds);

  useEffect(() => {
    clearGuildId();

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
    <Flex className='flex-nowrap gap-x-4'>
      <Select.Root onValueChange={setGuildId}>
        <Select.Trigger placeholder='Search by Server' />
        <Select.Content>
          <Select.Group>
            <Select.Label>
              Search by Server
            </Select.Label>
            {
              guilds.length > 0 && guilds.map((guild) => {
                return <Select.Item value={guild.id} id={guild.id} key={guild.id}>
                  <Avatar src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`} fallback='S' size='1' />
                  {' '}{guild.name}
                </Select.Item>
              })
            }
          </Select.Group>
        </Select.Content>
      </Select.Root>
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
    </Flex>
  );
}

export default DiscordList;
