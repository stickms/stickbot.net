import { Flex, Box } from "@radix-ui/themes";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { type SyncRoom } from "../lib/types";
import { API_ENDPOINT } from "../env";
import { fetchGetJson } from "../lib/util";
import useAuth from "../hooks/use-auth";
import MediaPlayer from "../components/media-player";
import ChatBox from "../components/chat-box";
import SocketConn from "../lib/socket";

function SyncRoom() {
  const { user } = useAuth();
  const { roomid } = useParams();
  const navigate = useNavigate();

  const webSocket = useRef<SocketConn | null>(null);
  const interval = useRef<NodeJS.Timeout | null>(null);

  const [room, setRoom] = useState<SyncRoom>();

  function editRoomMeta(meta: object) {
    setRoom((rm) => !rm ? rm : {
      ...rm,
      meta: {
        ...rm.meta,
        ...meta
      }
    });
  };

  useEffect(() => {
    if (!user.id || !roomid) {
      return;
    }

    if (webSocket.current) {
      return;
    }

    fetch(`${API_ENDPOINT}/sync/rooms/${roomid}`, {
      credentials: 'include'
    })
      .then(fetchGetJson)
      .then((data) => {
        setRoom(data['data']);

        webSocket.current = new SocketConn(
          `${API_ENDPOINT}/sync`,
          {
            id: user.id,
            username: user.username,
            room: roomid
          },
          (message) => {
            if (message.chat) {
              setRoom((rm) => !rm ? rm : {
                ...rm,
                meta: {
                  ...rm.meta,
                  messages: [ ...rm.meta.messages, message.chat ]
                }
              });
            }

            if (message.users) {
              setRoom((rm) => !rm ? rm : {
                ...rm,
                users: message.users
              });
            }

            if (message.background) {
              setRoom((rm) => !rm ? rm : {
                ...rm,
                background: message.background
              });
            }

            if (message.queue) {
              editRoomMeta({
                queue: message.queue
              });
            }
    
            if (message.play || message.pause) {
              editRoomMeta({
                playing: !!message.play,
                curtime: message.curtime
              }); 
            }
          }
        )
      })
      .catch(() => {
        navigate('/watch-together');
      });
  }, [ roomid, user, navigate ]);

  useEffect(() => {
    // "Heartbeat" - periodically check server status in case we get desynced
    if (interval.current) {
      clearInterval(interval.current);
    }

    interval.current = setInterval(() => {
      fetch(`${API_ENDPOINT}/sync/rooms/${roomid}`, {
        credentials: 'include'
      })
        .then(fetchGetJson)
        .then((data) => {
          const room_data: SyncRoom = data['data'];
          setRoom(room_data);
        })
        .catch(() => navigate('/watch-together'));
    }, 15_000); // Every 15 seconds

    return () => {
      if (interval.current) {
        clearInterval(interval.current);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ interval, roomid ]);

  const disconnect = useCallback(() => {
    if (!webSocket.current) {
      return;
    }

    webSocket.current.close();
    webSocket.current = null;
  }, [ webSocket ]);

  useEffect(() => {
    return () => {
      disconnect();
    }
  }, [disconnect]);

  window.addEventListener('beforeunload', () => {
    disconnect();
  });

  if (!room || !roomid || !webSocket.current) {
    return null;
  }

  const getBgSize = () => {
    if (room.background.size === 'fill') {
      return 'contain';
    } else if (room.background.size === 'stretch') {
      return '100% 100%';
    } else if (room.background.size === 'cover') {
      return 'cover';
    } else {
      return 'auto';
    }
  }

  return (
    <Flex className='items-start justify-center min-h-screen'>
      <Box
        className='absolute top-0 left-0 w-full h-screen bg-no-repeat bg-center -z-10 overflow-hidden'
        style={{
          backgroundImage: `url(${room.background.url})`,
          backgroundSize: getBgSize() 
        }}
      />
      <Flex className='mt-[min(8rem,_calc(4rem+7.5vw))] mb-8 mx-8 items-end justify-center gap-8 flex-wrap-reverse'>
        {/* Chat */}
        <ChatBox
          socket={webSocket.current}
          users={room.users}
          messages={room.meta.messages}
          host={room.host}
        />

        {/* Media Player */}
        <MediaPlayer
          socket={webSocket.current}
          playing={room.meta.playing}
          curtime={room.meta.curtime}
          queue={room.meta.queue}
          editRoomMeta={editRoomMeta}
        />
      </Flex>
    </Flex>
  );
}

export default SyncRoom;
