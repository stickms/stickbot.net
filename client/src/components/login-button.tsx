import {
  Button,
  Dialog,
  Em,
  Flex,
  Link,
  Popover,
  Separator,
  Tabs,
  Text,
  TextField
} from '@radix-ui/themes';
import { useLocation } from 'react-router-dom';
import { API_ENDPOINT } from '../env';
import { DiscordLogoIcon } from '@radix-ui/react-icons';
import { useRef, useState } from 'react';
import { useAuth } from '../hooks/use-auth';
import { fetchGetJson } from '../lib/util';

function LoginTab({ setOpen }: { setOpen: (open: boolean) => void }) {
  const { getUser } = useAuth();

  const email_ref = useRef<HTMLInputElement>(null);
  const password_ref = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [errorOpen, setErrorOpen] = useState<boolean>(false);
  const [error, setError] = useState<string>();

  function login() {
    setErrorOpen(false);

    if (!email_ref.current || !password_ref.current) {
      return;
    }

    const email = email_ref.current.value.trim();
    const password = password_ref.current.value;

    if (!email || !password) {
      setError('Please enter an email and password');
      setErrorOpen(true);
      return;
    }

    setLoading(true);

    fetch(`${API_ENDPOINT}/login`, {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({ email, password })
    })
      .then(fetchGetJson)
      .then(() => {
        getUser().then(() => setOpen(false));
      })
      .catch(() => {
        setError('Please try again');
        setErrorOpen(true);
      })
      .finally(() => setLoading(false));
  }

  return (
    <Tabs.Content value='login' className='flex flex-col gap-3'>
      <label>
        <Text className='text-sm'>Email</Text>
        <TextField.Root ref={email_ref} />
      </label>
      <label>
        <Text className='text-sm'>Password</Text>
        <TextField.Root ref={password_ref} type='password' />
      </label>

      <Flex className='my-4 gap-3 justify-center'>
        <Dialog.Close>
          <Button variant='soft' color='gray'>
            Cancel
          </Button>
        </Dialog.Close>
        <Popover.Root open={errorOpen} onOpenChange={setErrorOpen}>
          <Popover.Trigger>
            <Button onClick={login} loading={loading}>
              Login
            </Button>
          </Popover.Trigger>
          <Popover.Content size='1'>
            <Text color='gray' size='1' as='p' trim='both'>
              {error}
            </Text>
          </Popover.Content>
        </Popover.Root>
      </Flex>
    </Tabs.Content>
  );
}

function RegisterTab({ setOpen }: { setOpen: (open: boolean) => void }) {
  const { getUser } = useAuth();

  const username_ref = useRef<HTMLInputElement>(null);
  const email_ref = useRef<HTMLInputElement>(null);
  const password_ref = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [errorOpen, setErrorOpen] = useState<boolean>(false);
  const [error, setError] = useState<string>();

  function isInfoValid(
    username: string,
    email: string,
    password: string
  ): { success: boolean; message?: string } {
    const temporary = !email && !password;

    if (username.length < 2) {
      return {
        success: false,
        message: 'Usernames must be at least 2 characters long'
      };
    }

    if (!/^[a-z0-9-_.]+$/i.test(username)) {
      return {
        success: false,
        message:
          'Usernames can only contain alphanumeric, -, ., or _ characters'
      };
    }

    const matches = /[^@]+@[^@]+\.[^@]+/.exec(email);
    if (!temporary && matches?.[0] !== email) {
      return {
        success: false,
        message: 'Please enter a valid email address'
      };
    }

    if (!temporary && password.length < 6) {
      return {
        success: false,
        message: 'Passwords must be at least 6 characters long'
      };
    }

    if (!temporary && (/^\s/.test(password) || /\s$/.test(password))) {
      return {
        success: false,
        message: 'Passwords cannot start or end with whitespace'
      };
    }

    return {
      success: true
    };
  }

  function register() {
    setErrorOpen(false);

    if (!username_ref.current || !email_ref.current || !password_ref.current) {
      return;
    }

    const username = username_ref.current.value.trim();
    const email = email_ref.current.value.trim();
    const password = password_ref.current.value;

    const valid = isInfoValid(username, email, password);

    if (!valid.success) {
      setError(valid.message!);
      setErrorOpen(true);
      return;
    }

    setLoading(true);

    fetch(`${API_ENDPOINT}/register`, {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({ username, email, password })
    })
      .then(fetchGetJson)
      .then(() => {
        getUser().then(() => setOpen(false));
      })
      .catch(() => {
        setError('Please try again');
        setErrorOpen(true);
      })
      .finally(() => setLoading(false));
  }

  return (
    <Tabs.Content value='register' className='flex flex-col gap-3'>
      <label>
        <Text className='text-sm'>Username</Text>
        <TextField.Root ref={username_ref} />
      </label>
      <label>
        <Text className='text-sm'>Email</Text>
        <TextField.Root ref={email_ref} />
      </label>
      <label>
        <Text className='text-sm'>Password</Text>
        <TextField.Root ref={password_ref} type='password' />
      </label>

      <Text color='gray' className='text-xs text-center'>
        <Em>
          Leave email and password blank if you want to use a temporary account
        </Em>
      </Text>

      <Flex className='my-4 gap-3 justify-center'>
        <Dialog.Close>
          <Button variant='soft' color='gray'>
            Cancel
          </Button>
        </Dialog.Close>
        <Popover.Root open={errorOpen} onOpenChange={setErrorOpen}>
          <Popover.Trigger>
            <Button onClick={register} loading={loading}>
              Register
            </Button>
          </Popover.Trigger>
          <Popover.Content size='1'>
            <Text color='gray' size='1' as='p' trim='both'>
              {error}
            </Text>
          </Popover.Content>
        </Popover.Root>
      </Flex>
    </Tabs.Content>
  );
}

function LoginButton() {
  const location = useLocation();

  const [open, setOpen] = useState<boolean>(false);
  const [tab, setTab] = useState<string>('login');

  const redirect = `?redirect=${encodeURIComponent(location.pathname)}`;

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger>
        <Button>Login</Button>
      </Dialog.Trigger>

      <Dialog.Content className='w-96 max-w-[90vw]'>
        <Dialog.Title>Login or Register</Dialog.Title>

        <Tabs.Root value={tab} onValueChange={setTab}>
          <Tabs.List className='mb-3'>
            <Tabs.Trigger value='login'>Login</Tabs.Trigger>
            <Tabs.Trigger value='register'>Register</Tabs.Trigger>
          </Tabs.List>

          <LoginTab setOpen={setOpen} />
          <RegisterTab setOpen={setOpen} />
        </Tabs.Root>

        <Flex className='flex-col gap-4 items-center'>
          <Flex className='items-center gap-4'>
            <Separator size='2' />
            <Text color='gray'>or</Text>
            <Separator size='2' />
          </Flex>

          <Link href={`${API_ENDPOINT}/login/discord${redirect}`}>
            <Button>
              <DiscordLogoIcon /> Discord Login
            </Button>
          </Link>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}

export default LoginButton;
