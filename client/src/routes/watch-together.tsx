import { Button, Card, Flex, Link, Skeleton, Text } from "@radix-ui/themes";
import { useEffect, useState } from "react";
import { API_ENDPOINT } from "../env";
import { DiscordLogoIcon, EnterIcon } from "@radix-ui/react-icons";
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

function RoomList() {
  const { toast } = useToast();
  const [ rooms, setRooms ] = useState<SyncRoom[]>();
  const navigate = useNavigate();

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

  return (
    <Flex className='flex-col items-center gap-24 min-h-screen'>
      <Text className='text-3xl mt-40'>Sync Rooms</Text>
      <Flex className='items-center justify-center gap-4 mb-8'>
        {!rooms && <Skeleton className='w-80 max-w-[80vw] min-h-20' />}
        {rooms && rooms.map((room) => (
          <Card key={room.id} className='flex flex-col p-4 items-stretch justify-center gap-4 w-80 max-w-[80vw] min-h-20'>
            <Text className='text-xl'>{room.name}</Text>
            <Text>hosted by {room.host}</Text>
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

  if (!user.sync.room) {
    return <RoomList />;
  }

  return null;
}

export default WatchTogether;
