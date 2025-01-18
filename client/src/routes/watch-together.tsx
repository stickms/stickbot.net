import { Button, Callout, Card, Flex, IconButton, Link, Text, TextField, Tooltip } from "@radix-ui/themes";
import { useEffect, useRef, useState } from "react";
import { API_ENDPOINT } from "../env";
import { Cross1Icon, DiscordLogoIcon, EnterIcon, InfoCircledIcon, PlusIcon } from "@radix-ui/react-icons";
import { useLocation, useNavigate } from "react-router-dom";
import useAuth from "../hooks/use-auth";
import { fetchGetJson } from "../lib/util";
import useToast from "../hooks/use-toast";
import { SyncRoom } from "../lib/types";

function SignIn() {
  const location = useLocation();
  const redirect = `?redirect=${encodeURIComponent(location.pathname)}`;

  return (
    <Flex className='items-center justify-center min-h-screen'>
      <Flex className='my-16 flex-col items-center justify-evenly gap-24'>
        <Text className='text-3xl'>Watch Together</Text>

        <Flex className='flex-col items-center gap-4'>
          <Text className='text-center'>Sign-in to continue</Text>
          <Link href={`${API_ENDPOINT}/login/discord${redirect}`}>
            <Button>
              <DiscordLogoIcon /> Login
            </Button>
          </Link>
        </Flex>
      </Flex>
    </Flex>
  );
}

function RoomList({ userid }: { userid: string }) {
  const { toast } = useToast();
  const [ rooms, setRooms ] = useState<SyncRoom[]>();
  const navigate = useNavigate();

  const inputbar = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`${API_ENDPOINT}/sync/rooms`, {
      credentials: 'include'
    })
      .then(fetchGetJson)
      .then((data) => {
        setRooms(data['data']);
      })
      .catch(() => {
        toast({
          title: 'Error fetching rooms',
          description: 'Please try again later'
        });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const joinRoom = (roomid: string) => {
    fetch(`${API_ENDPOINT}/sync/rooms/${roomid}/join`, {
      method: 'POST',
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
      })
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
  }

  const createRoom = () => {
    if(!inputbar.current) {
      return;
    }

    const name = inputbar.current.value.trim();

    if (!name) {
      toast({
        title: 'Error creating room',
        description: 'Please enter a room name'
      });

      return;
    }

    fetch(`${API_ENDPOINT}/sync/rooms/create`, {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({
        name
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
      })
  }

  return (
    <Flex className='flex-col items-center gap-24 min-h-screen'>
      <Text className='text-3xl mt-40'>Sync Rooms</Text>

      <TextField.Root
        ref={inputbar}
        className='w-96 max-w-[80vw]'
        placeholder='Create a room...'
        maxLength={32}
        onKeyDown={(e) => e.key === 'Enter' && createRoom()}
      >
        <TextField.Slot side='right'>
          <IconButton
            variant='ghost'
            onClick={createRoom}
          >
            <PlusIcon />
          </IconButton>
        </TextField.Slot>
      </TextField.Root>

      <Flex className='items-stretch justify-center flex-wrap gap-4 mb-8 max-w-[80vw]'>
        {!rooms?.length && (
          <Callout.Root>
            <Callout.Icon>
              <InfoCircledIcon />
            </Callout.Icon>
            <Callout.Text>
              No rooms found, create one to get started!
            </Callout.Text>
          </Callout.Root>
        )}
        {!!rooms?.length && rooms.map((room) => (
          <Card key={room.id} className='flex flex-col p-4 items-stretch justify-between gap-4 w-80 max-w-[80vw] min-h-20'>
            <Flex className='items-start justify-between'>
              <Text className='text-lg break-all whitespace-pre-line'>
                {room.name + '\n'}
                <Text color='gray' className='text-sm'>hosted by {room.host}</Text>
              </Text>
              {room.host === userid && (
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
            <Button
              onClick={() => joinRoom(room.id)}
            >
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
