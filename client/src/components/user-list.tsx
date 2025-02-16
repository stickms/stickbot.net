import { useEffect, useState } from 'react';
import {
  Flex,
  Text,
  ScrollArea,
  Box,
  Badge,
  Separator,
  TextField,
  Tooltip,
  IconButton,
  HoverCard,
  Avatar,
  Code
} from '@radix-ui/themes';
import { useAuth } from '../hooks/use-auth';
import { useToast } from '../hooks/use-toast';
import { API_ENDPOINT } from '../env';
import {
  MagnifyingGlassIcon,
  MinusIcon,
  PlusIcon
} from '@radix-ui/react-icons';
import { fetchGetJson, getDiscordAvatar } from '../lib/util';

type UserListType = {
  id: string;
  discord_id?: string;
  username: string;
  avatar?: string;
  is_admin: boolean;
};

function UserCard({ user }: { user: UserListType }) {
  return (
    <HoverCard.Content className='p-4'>
      <Flex className='gap-2'>
        <Avatar
          size='3'
          fallback='U'
          src={getDiscordAvatar(user.discord_id, user.avatar)}
        />
        <Flex className='flex-col gap-2'>
          <Text>{user.username ?? 'Username N/A'}</Text>
          <Code className='text-sm w-min' color='gray'>
            {'#' + user.id}
          </Code>
          {!!user.discord_id && (
            <Code className='text-sm w-min' color='gray'>
              {'<@' + user.discord_id + '>'}
            </Code>
          )}
        </Flex>
      </Flex>
    </HoverCard.Content>
  );
}

function UserList() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [users, setUsers] = useState<UserListType[]>([]);
  const [userQuery, setUserQuery] = useState<string>('');
  const [modifying, setModifying] = useState<boolean>(false);

  useEffect(() => {
    if (!user.is_admin || modifying) {
      return;
    }

    fetch(`${API_ENDPOINT}/admin/list-users`, { credentials: 'include' })
      .then(fetchGetJson)
      .then((data) => {
        setUsers(data['data']);
      })
      .catch(() => {
        setUsers([]);
      });
  }, [user.is_admin, modifying]);

  const modifyAdmin = (u: UserListType) => {
    setModifying(() => true);

    const endpoint = !u.is_admin ? '/admin/add' : '/admin/remove';
    fetch(`${API_ENDPOINT}${endpoint}?userid=${u.id}`, {
      method: 'POST',
      credentials: 'include'
    })
      .then((resp) => {
        if (!resp.ok) {
          throw new Error(resp.statusText);
        }
      })
      .catch((e) => {
        toast({
          title: 'Error: Could not change admin state',
          description: e.message
        });
      })
      .finally(() => setModifying(() => false));
  };

  return (
    <Flex className='max-w-[80vw] items-center justify-center flex-col gap-8'>
      <Text className='text-2xl'>User List</Text>
      <TextField.Root
        placeholder='Search user list...'
        value={userQuery}
        maxLength={128}
        onChange={(e) => setUserQuery(e.target.value)}
      >
        <TextField.Slot>
          <MagnifyingGlassIcon />
        </TextField.Slot>
      </TextField.Root>
      <ScrollArea type='auto' scrollbars='vertical' className='max-h-96'>
        <Box className='w-full px-4 py-1'>
          {users
            .filter((u) => {
              return (
                !userQuery ||
                u.id.includes(userQuery) ||
                u.username?.includes(userQuery)
              );
            })
            .map((u) => (
              <Box key={u.id}>
                <Flex className='items-center justify-between gap-4'>
                  <HoverCard.Root>
                    <HoverCard.Trigger>
                      <Text color={u.id === user.id ? 'amber' : undefined}>
                        {u.username ?? 'Username N/A'}
                      </Text>
                    </HoverCard.Trigger>
                    <UserCard user={u} />
                  </HoverCard.Root>
                  <Flex className='gap-2 items-center justify-center'>
                    {u.is_admin && (
                      <Tooltip content='Website Admin'>
                        <Badge>A</Badge>
                      </Tooltip>
                    )}
                    <Tooltip content={!u.is_admin ? 'Promote' : 'Demote'}>
                      <IconButton
                        size='1'
                        onClick={() => modifyAdmin(u)}
                        disabled={modifying || u.id === user.id}
                      >
                        {!u.is_admin && <PlusIcon />}
                        {u.is_admin && <MinusIcon />}
                      </IconButton>
                    </Tooltip>
                  </Flex>
                </Flex>
                <Separator size='4' className='my-1' />
              </Box>
            ))}
        </Box>
      </ScrollArea>
    </Flex>
  );
}

export default UserList;
