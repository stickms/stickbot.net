import {
  Flex,
  Text,
  Code,
  ScrollArea,
  Box,
  Badge,
  Separator,
  TextField,
  Tooltip,
  IconButton
} from '@radix-ui/themes';
import useAuth from '../hooks/use-auth';
import { useNavigate } from 'react-router-dom';
import useToast from '../hooks/use-toast';
import { useEffect, useState } from 'react';
import { API_ENDPOINT } from '../env';
import {
  MagnifyingGlassIcon,
  MinusIcon,
  PlusIcon
} from '@radix-ui/react-icons';
import { fetchGetJson } from '../lib/util';

type UserListType = {
  id: string;
  is_admin: boolean;
};

function UserList() {
  const { user, admin } = useAuth();
  const { toast } = useToast();

  const [users, setUsers] = useState<UserListType[]>([]);
  const [userQuery, setUserQuery] = useState<string>('');
  const [modifying, setModifying] = useState<boolean>(false);

  useEffect(() => {
    if (!admin || modifying) {
      return;
    }

    fetch(`${API_ENDPOINT}/admin/list-users`, { credentials: 'include' })
      .then(fetchGetJson)
      .then((data) => {
        setUsers(() => data['data']);
        setUsers((cur) =>
          cur.sort((a, b) => {
            return a.is_admin === b.is_admin ? 0 : a.is_admin ? -1 : 1;
          })
        );
      })
      .catch(() => {
        setUsers(() => []);
      });
  }, [admin, modifying]);

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
        <Box className='w-full px-4'>
          {users
            .filter((u) => !userQuery || u.id.includes(userQuery))
            .map((u) => {
              return (
                <Box>
                  <Flex className='items-center justify-between gap-4'>
                    <Text>
                      {u.is_admin && <Badge>A</Badge>} {u.id}
                    </Text>
                    <Tooltip
                      content={!u.is_admin ? 'Add Admin' : 'Remove Admin'}
                    >
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
                  <Separator size='4' className='my-1' />
                </Box>
              );
            })}
        </Box>
      </ScrollArea>
    </Flex>
  );
}

function AdminPortal() {
  const { user, admin, validateAdmin } = useAuth();
  const { toast } = useToast();
  const navigation = useNavigate();

  useEffect(() => {
    validateAdmin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!user.id || !admin) {
    toast({
      title: 'Error: Unauthorized',
      description: 'Sorry, you cannot access that page'
    });

    navigation('/');
    return null;
  }

  return (
    <Flex className='items-center justify-center flex-col gap-16'>
      <Flex className='mt-[20vh] flex-wrap items-center justify-center gap-y-6 text-center'>
        <Text className='text-3xl w-full'>Admin Portal</Text>
        <Text className='text-lg'>
          Welcome, <Code>{user.username}</Code>
        </Text>
      </Flex>

      <UserList />
    </Flex>
  );
}

export default AdminPortal;
