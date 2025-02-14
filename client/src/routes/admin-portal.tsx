import { Flex, Text, Code } from '@radix-ui/themes';
import { useAuth } from '../hooks/use-auth';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { TypeAnimation } from 'react-type-animation';
import UserList from '../components/user-list';

function AdminPortal() {
  const { user, validateAdmin } = useAuth();
  const navigation = useNavigate();

  useEffect(() => {
    validateAdmin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!user.id || !user.is_admin) {
    navigation('/');
    return null;
  }

  return (
    <Flex className='items-center justify-center flex-col gap-16 pt-40 pb-16'>
      <Flex className='flex-col items-center justify-center gap-6 text-center'>
        <Text className='text-3xl text-center font-[Bipolar] h-8'>
          <TypeAnimation sequence={[100, 'ADMIN PORTAL']} cursor={false} />
        </Text>
        <Text className='text-lg'>
          Welcome, <Code>{user.username}</Code>
        </Text>
      </Flex>

      <UserList />
    </Flex>
  );
}

export default AdminPortal;
