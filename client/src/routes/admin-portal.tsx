import { VStack, Text, Mark, Input, Container, HStack, Separator, IconButton, Badge } from '@chakra-ui/react';
import useAuth from '../hooks/use-auth';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { API_ENDPOINT } from '../env';

import { fetchGetJson, getDiscordAvatar } from '../lib/util';
import { toaster } from '@/components/ui/toaster';
import { Avatar } from '@/components/ui/avatar';
import { Tooltip } from '@/components/ui/tooltip';
import { FaMinus, FaPlus } from 'react-icons/fa';

type UserListType = {
  id: string;
  discord_id?: string;
  username: string;
  avatar?: string;
  is_admin: boolean;
};

function UserList() {
  const { user } = useAuth();

  const [users, setUsers] = useState<UserListType[]>([]);
  const [userQuery, setUserQuery] = useState<string>('');
  const [modifying, setModifying] = useState<boolean>(false);

  useEffect(() => {
    if (!user.is_admin || modifying) {
      return;
    }

    fetch(`${API_ENDPOINT}/admin/list-users`, { credentials: 'include' })
      .then(fetchGetJson)
      .then((data) => setUsers(data['data']))
      .catch(() => setUsers([]));
  }, [user.is_admin, modifying]);

  const modifyAdmin = (u: UserListType) => {
    setModifying(true);

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
        toaster.create({
          title: 'Error: Could not change admin state',
          description: e.message
        });
      })
      .finally(() => setModifying(false));
  };

  return (
    <VStack w='72' maxW='80vw' gap='8'>
      <Text fontSize='2xl'>User List</Text>

      <Input
        size='sm'
        placeholder='Search user list...'
        value={userQuery}
        onChange={(e) => setUserQuery(e.target.value)}
      />

      <VStack overflowY='auto' maxH='96' w='72' maxW='80vw' scrollMargin='2' px='2' py='2'>
        {users.filter((u) => (!userQuery || u.username.includes(userQuery)))
          .map((u) => (
            <Container w='full'>
              <HStack justify='space-between'>
                <HStack textWrap='wrap' overflowWrap='anywhere'>
                  <Avatar
                    shape={'rounded'}
                    size='2xs'
                    src={getDiscordAvatar(u.discord_id, u.avatar)}
                  />
                  {u.username}
                </HStack>

                <HStack>
                  {u.is_admin && (
                    <Badge>A</Badge>
                  )}
                  <Tooltip
                    content={u.is_admin ? 'Demote' : 'Promote'}
                    showArrow
                  >
                    <IconButton
                      size='2xs'
                      variant='ghost'
                      onClick={() => modifyAdmin(u)}
                    >
                      {u.is_admin ? <FaMinus /> : <FaPlus />}
                    </IconButton>
                  </Tooltip>
                </HStack>
              </HStack>
              <Separator mt='2' />
            </Container>
          )
        )}
      </VStack>
    </VStack>
  );
}

function AdminPortal() {
  const { user, validateAdmin } = useAuth();
  const navigation = useNavigate();

  useEffect(() => {
    validateAdmin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!user.id || !user.is_admin) {
    toaster.create({
      title: 'Error: Unauthorized',
      description: 'Sorry, you cannot access that page'
    });

    navigation('/');
    return null;
  }

  return (
    <VStack pt='40' pb='8' gap='16'>
      <VStack gap='6'>
        <Text fontSize='3xl'>Admin Portal</Text>
        <Text fontSize='text-lg'>Welcome, <Mark>{user.username}</Mark></Text>
      </VStack>

      <UserList />
    </VStack>
  );
}

export default AdminPortal;
