import { Flex, Box } from "@radix-ui/themes";
import { MutableRefObject, useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { UserType, type SyncRoom } from "../lib/types";
import { API_ENDPOINT } from "../env";
import { fetchGetJson } from "../lib/util";
import { hc } from "hono/client";
import useAuth from "../hooks/use-auth";
import MediaPlayer from "../components/media-player";
import ChatBox from "../components/chat-box";

function connect(
  user: UserType,
  roomid: string,
  socketRef: MutableRefObject<WebSocket | null>,
  setSocket: (socket: WebSocket | null) => void,
  openCallback: (socket: WebSocket, event: Event) => unknown,
  messageCallback: (socket: WebSocket, event: MessageEvent<string>) => unknown,
) {
  const client = hc(`${API_ENDPOINT}/sync`);
  const socket = client.ws.$ws({
    query: {
      id: user.id,
      username: user.username,
      room: roomid
    }
  });

  socket.addEventListener('open', (e) => openCallback(socket, e));
  socket.addEventListener('message', (e) => messageCallback(socket, e));

  socket.addEventListener('close', () => {
    if (socketRef.current) {
      console.error('WebSocket unexpectedly closed, reconnecting in 1s...');
      setTimeout(() => {
        connect(user, roomid, socketRef, setSocket, openCallback, messageCallback);
      }, 1_000);
    }
  });

  socket.addEventListener('error', () => {
    console.error('WebSocket error encountered, closing...');
    socket.close();
    socketRef.current = null;
  });

  setSocket(socket);
}

function SyncRoom() {
  const { user } = useAuth();
  const { roomid } = useParams();
  const navigate = useNavigate();

  const webSocket = useRef<WebSocket | null>(null);
  const interval = useRef<NodeJS.Timeout | null>(null);

  const [room, setRoom] = useState<SyncRoom>();

  const editRoomMeta = (meta: object) => {
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
      //navigate('/watch-together');
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
        
        connect(
          user,
          roomid,
          webSocket,
          (socket) => {
            webSocket.current = socket;
          },
          (socket) => {
            socket.send(JSON.stringify({
              command: 'join'
            }))
          },
          (_, event) => {
            const message = JSON.parse(event.data);
            console.log(message);
    
            if (message.chat) {
              editRoomMeta({
                messages: message.chat
              });
            }

            if (message.users) {
              setRoom((rm) => !rm ? rm : {
                ...rm,
                users: message.users
              });
            }

            if (message.background !== undefined) {
              setRoom((rm) => !rm ? rm : {
                ...rm,
                background: message.background ?? undefined
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
          if (room != room_data) {
            setRoom(room_data);
          }
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

  return (
    <Flex className='items-start justify-center min-h-screen'>
      <Box
        className='absolute top-16 w-full h-[calc(100vh-4rem)] bg-contain bg-no-repeat bg-center -z-10'
        style={{ backgroundImage: `url(${room.background})` }}
      />
      <Flex className='mt-16 xl:mt-40 mb-8 mx-8 items-end justify-center gap-8 flex-wrap-reverse'>
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
