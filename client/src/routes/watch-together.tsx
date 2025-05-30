import {
  Button,
  Callout,
  Card,
  Checkbox,
  Flex,
  IconButton,
  Text,
  TextField,
  Tooltip
} from '@radix-ui/themes';
import { useEffect, useRef, useState } from 'react';
import { API_ENDPOINT } from '../env';
import {
  Cross1Icon,
  EnterIcon,
  InfoCircledIcon,
  PlusIcon
} from '@radix-ui/react-icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/use-auth';
import { fetchGetJson } from '../lib/util';
import { useToast } from '../hooks/use-toast';
import { SyncRoom } from '../lib/types';
import { TypeAnimation } from 'react-type-animation';
import LoginButton from '../components/login-button';

function SignIn() {
  return (
    <Flex className='flex-col items-center justify-center min-h-screen gap-24 py-32'>
      <Text className='text-3xl text-center font-[Bipolar] h-8'>
        <TypeAnimation sequence={[100, 'WATCH TOGETHER']} cursor={false} />
      </Text>

      <Flex className='flex-col items-center gap-4'>
        <Text className='text-center'>Sign-in to continue</Text>
        <LoginButton />
      </Flex>
    </Flex>
  );
}

function RoomList({ userid }: { userid: string }) {
  const { toast } = useToast();
  const [rooms, setRooms] = useState<SyncRoom[]>();
  const navigate = useNavigate();

  const inputbar = useRef<HTMLInputElement>(null);
  const unlistedbox = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    fetch(`${API_ENDPOINT}/sync/rooms`, {
      credentials: 'include'
    })
      .then(fetchGetJson)
      .then((data) => {
        setRooms(data['data']);
      })
      .catch(() => {
        setRooms([]);
        toast({
          title: 'Error fetching rooms',
          description: 'Please try again later'
        });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const joinRoom = (roomid: string) => {
    fetch(`${API_ENDPOINT}/sync/rooms/${roomid}/validate`, {
      credentials: 'include'
    })
      .then(fetchGetJson)
      .then(() => {
        navigate(`/sync/room/${roomid}`);
      })
      .catch(() => {
        toast({
          title: 'Error joining room',
          description: 'Please try again later'
        });
      });
  };

  const deleteRoom = (roomid: string) => {
    fetch(`${API_ENDPOINT}/sync/rooms/${roomid}`, {
      method: 'DELETE',
      credentials: 'include'
    })
      .then(fetchGetJson)
      .then((data) => {
        setRooms(data['data']);
      })
      .catch(() => {
        toast({
          title: 'Error deleting room',
          description: 'Please try again later'
        });
      });
  };

  const createRoom = () => {
    if (!inputbar.current) {
      return;
    }

    const name = inputbar.current.value.trim();

    if (name.length < 3) {
      toast({
        title: 'Error creating room',
        description: 'Room names must be between 3-64 characters'
      });

      return;
    }

    const unlisted = unlistedbox.current?.ariaChecked === 'true';

    fetch(`${API_ENDPOINT}/sync/rooms/create`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        unlisted
      })
    })
      .then(fetchGetJson)
      .then((data) => {
        navigate(`/sync/room/${data['data']['roomid']}`);
      })
      .catch(() => {
        toast({
          title: 'Error creating room',
          description: 'Please try again later'
        });
      });
  };

  return (
    <Flex className='flex-col items-center gap-24 min-h-screen pt-40 pb-16'>
      <Text className='text-3xl text-center font-[Bipolar] h-8'>
        <TypeAnimation
          sequence={[100, 'WATCH TOGETHER ROOMS']}
          cursor={false}
        />
      </Text>

      <Flex className='items-center justify-center flex-col gap-4'>
        <TextField.Root
          ref={inputbar}
          className='w-96 max-w-[80vw]'
          placeholder='Create a room...'
          maxLength={32}
          onKeyDown={(e) => e.key === 'Enter' && createRoom()}
        >
          <TextField.Slot side='right'>
            <IconButton variant='ghost' onClick={createRoom}>
              <PlusIcon />
            </IconButton>
          </TextField.Slot>
        </TextField.Root>
        <Text as='label'>
          <Flex className='gap-1 items-center'>
            <Checkbox size='3' ref={unlistedbox} />
            Create Unlisted Room
          </Flex>
        </Text>
      </Flex>

      <Flex className='items-stretch justify-center flex-wrap gap-4 max-w-[80vw]'>
        {rooms && !rooms.length && (
          <Callout.Root>
            <Callout.Icon>
              <InfoCircledIcon />
            </Callout.Icon>
            <Callout.Text>
              No rooms found, create one to get started!
            </Callout.Text>
          </Callout.Root>
        )}
        {!!rooms?.length &&
          rooms.map((room) => (
            <Card
              key={room.id}
              className='flex flex-col p-4 items-stretch justify-between gap-4 w-80 max-w-[80vw] min-h-20'
            >
              <Flex className='items-start justify-between'>
                <Text className='text-lg break-all whitespace-pre-line'>
                  {room.name + '\n'}
                  <Text color='gray' className='text-sm'>
                    hosted by {room.host.username}
                  </Text>
                </Text>
                {room.host.id === userid && (
                  <Tooltip content='Close Room'>
                    <IconButton
                      variant='ghost'
                      color='red'
                      onClick={() => deleteRoom(room.id)}
                    >
                      <Cross1Icon />
                    </IconButton>
                  </Tooltip>
                )}
              </Flex>
              <Button onClick={() => joinRoom(room.id)}>
                <EnterIcon /> Join
              </Button>
            </Card>
          ))}
      </Flex>
    </Flex>
  );
}

function WatchTogether() {
  const { user } = useAuth();

  if (!user.id) {
    return <SignIn />;
  }

  return <RoomList userid={user.id} />;
}

export default WatchTogether;
