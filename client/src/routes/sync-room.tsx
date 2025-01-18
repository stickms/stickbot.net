import { Box, Card, Flex, IconButton, Link, ScrollArea, Separator, Text, TextField } from "@radix-ui/themes";
import { MutableRefObject, useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { type SyncRoom } from "../lib/types";
import { API_ENDPOINT } from "../env";
import { fetchGetJson } from "../lib/util";
import { hc } from "hono/client";
import useAuth from "../hooks/use-auth";
import ReactPlayer from 'react-player';
import { Cross1Icon, PaperPlaneIcon, PlusIcon } from "@radix-ui/react-icons";
import useToast from "../hooks/use-toast";

function connect(
  socketRef: MutableRefObject<WebSocket | null>,
  setSocket: (socket: WebSocket | null) => void,
  openCallback: (socket: WebSocket, event: Event) => unknown,
  messageCallback: (socket: WebSocket, event: MessageEvent<string>) => unknown,
) {
  const client = hc(`${API_ENDPOINT}/sync`);
  const socket = client.ws.$ws(0);

  socket.addEventListener('open', (e) => openCallback(socket, e));
  socket.addEventListener('message', (e) => messageCallback(socket, e));

  socket.addEventListener('close', () => {
    if (socketRef.current) {
      console.error('WebSocket unexpectedly closed, reconnecting in 1s...');
      setTimeout(() => {
        connect(socketRef, setSocket, openCallback, messageCallback);
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

function ChatBox({ roomid, users, messages } : { roomid: string, users: string[], messages: string[] }) {
  const { toast } = useToast();

  const message_area = useRef<HTMLDivElement>(null);
  const chat_box = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (message_area.current) {
      message_area.current.scrollTop = message_area.current.scrollHeight;
    }
  }, []);

  const sendChatMessage = () => {
    if (!chat_box.current) {
      return;
    }

    if (!chat_box.current.value.trim()) {
      return;
    }

    fetch(`${API_ENDPOINT}/sync/rooms/${roomid}/message`, {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({
        message: chat_box.current.value.trim()
      })
    })
      .then(fetchGetJson)
      .catch(() => {
        toast({
          title: 'Error sending message',
          description: 'Please try again later'
        });
      })
      .finally(() => chat_box.current!.value = '');
  }

  return (
    <Card className='flex flex-wrap w-[600px] max-w-[80vw] h-[400px] p-1'>
      {/* User List */}
      <Box className='h-[90%] basis-[33%] max-w-[150px] flex-shrink p-1 whitespace-pre-line'>
        <ScrollArea className='pr-3 pl-1' scrollbars='vertical' type='always'>
          {users.map((user) => (
            <Text key={user} className='text-sm break-all'>
              {user.substring(user.indexOf(':')+1)}{'\n'}
            </Text>
          ))}
        </ScrollArea>
      </Box>

      {/* Messages */}
      <Box className='h-[90%] basis-[67%] p-1 flex-grow'>
        <ScrollArea ref={message_area} type='always' scrollbars='vertical' className='pr-3 whitespace-pre-line'>
          {messages.map((msg, i) => (
            <Text key={i} className='text-sm break-all'>
              {msg.substring(0, msg.indexOf(':'))}
              <Text color='gray'>
                {msg.substring(msg.indexOf(':')) + '\n'}
              </Text>
            </Text>
          ))}
        </ScrollArea>
      </Box>

      {/* Message Entry Box */}
      <Flex className='h-[10%] w-[100%] p-1'>
        <TextField.Root
          ref={chat_box}
          className='size-full'
          placeholder='Enter chat message...'
          onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
        >
          <TextField.Slot side='right'>
            <IconButton
              variant='ghost'
              onClick={sendChatMessage}
            >
              <PaperPlaneIcon />
            </IconButton>
          </TextField.Slot>
        </TextField.Root>
      </Flex>
    </Card>
  );
}

function SyncRoom() {
  const { user } = useAuth();
  const { roomid } = useParams();
  const { toast } = useToast();
  const navigate = useNavigate();

  const webSocket = useRef<WebSocket | null>(null);

  const [room, setRoom] = useState<SyncRoom>();

  const player = useRef<ReactPlayer>(null);
  const media_queue = useRef<HTMLInputElement>(null);

  useEffect(() => {
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
          webSocket,
          (socket) => {
            webSocket.current = socket;
          },
          (socket) => {
            console.log('open!');

            socket.send(JSON.stringify({
              id: user.id,
              username: user.username,
              room: roomid
            }));
    
            socket.send(JSON.stringify({
              join: true,
              user: `${user.id}:${user.username}`
            }))
          },
          (_, event) => {
            const message = JSON.parse(event.data);
            console.log(message);
    
            if (message.chat) {
              setRoom((rm) => !rm ? rm : {
                ...rm,
                meta: {
                  ...rm.meta,
                  messages: message.chat
                }
              });
            }

            if (message.users) {
              setRoom((rm) => !rm ? rm : {
                ...rm,
                users: message.users
              });
            }

            if (message.queue) {
              setRoom((rm) => !rm ? rm : {
                ...rm,
                meta: {
                  ...rm.meta,
                  queue: message.queue
                }
              });
            }
    
            if (message.play && !player.current?.props.playing) {
              setRoom((rm) => !rm ? rm : {
                ...rm,
                meta: {
                  ...rm.meta,
                  playing: true
                }
              });

              player.current?.seekTo(message.curtime, 'seconds');
            }
  
            if (message.pause && !!player.current?.props.playing) {
              setRoom((rm) => !rm ? rm : {
                ...rm,
                meta: {
                  ...rm.meta,
                  playing: false
                }
              });

              player.current?.seekTo(message.curtime, 'seconds');
            }
          }
        )
      })
      .catch(() => {
        navigate('/watch-together');;
      });

    // "Heartbeat" - periodically check server status in case we get desynced
    setInterval(() => {
      fetch(`${API_ENDPOINT}/sync/rooms/${roomid}`, {
        credentials: 'include'
      })
        .then(fetchGetJson)
        .then((data) => {
          const room_data: SyncRoom = data['data'];
          if (room != room_data) {
            setRoom(room_data);

            if (player.current) {
              if (Math.abs(room_data.meta.curtime - player.current.getCurrentTime()) > 2.5) {
                player.current.seekTo(room_data.meta.curtime)
              }  
            }  
          }
        })
          .catch(() => navigate('/watch-together'));
    }, 15_000); // Every 15 seconds
  }, [ roomid, user.id ]);

  const disconnect = useCallback(() => {
    if (!webSocket.current || webSocket.current.readyState !== 1) {
      return;
    }

    webSocket.current.send(JSON.stringify({
      leave: true,
      user: user.id
    }))

    webSocket.current.close();

    webSocket.current = null;
  }, [ webSocket, user.id ]);

  useEffect(() => {
    return () => {
      disconnect();
    }
  }, [disconnect]);

  window.addEventListener('beforeunload', () => {
    disconnect();
  });

  if (!room || !roomid) {
    return null;
  }

  const onReady = (player: ReactPlayer) => {
    if (room.meta.curtime) {
      player.seekTo(room.meta.curtime, 'seconds');
    }
  };

  const onPlay = () => {
    if (!player.current || room.meta.playing) {
      return;
    }

    setRoom((rm) => !rm ? rm : {
      ...rm,
      meta: {
        ...rm.meta,
        playing: true
      }
    });
    mediaPlay();
  };

  const onPause = () => {
    console.log('pause');

    if (!player.current || !room.meta.playing) {
      return;
    }

    setRoom((rm) => !rm ? rm : {
      ...rm,
      meta: {
        ...rm.meta,
        playing: false
      }
    });
    mediaPause();
  };

  const onFinished = () => {
    console.log('finished');

    if (!player.current || !player.current.getCurrentTime()) {
      return;
    }

    player.current.seekTo(0);
    queueRemove(room.meta.queue[0]?.split(':')[0]);
    mediaPlay(0);
  }

  const mediaPlay = (curtime?: number) => {
    if (!player.current) {
      return;
    }

    fetch(`${API_ENDPOINT}/sync/rooms/${roomid}/play`, {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({
        curtime: curtime ?? Math.floor(player.current.getCurrentTime())
      })
    })
      .then(fetchGetJson)
      .catch(() => {
        toast({
          title: 'Error sending play request to server',
          description: 'Please try again later'
        });
      });
  };

  const mediaPause = () => {
    if (!player.current) {
      return;
    }

    fetch(`${API_ENDPOINT}/sync/rooms/${roomid}/pause`, {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({
        curtime: Math.floor(player.current.getCurrentTime())
      })
    })
      .then(fetchGetJson)
      .catch(() => {
        toast({
          title: 'Error sending pause request to server',
          description: 'Please try again later'
        });
      });
  }

  const queueAdd = () => {
    if (!media_queue.current) {
      return;
    }

    const url = media_queue.current.value.trim();

    if (!url || !URL.parse(url) || !ReactPlayer.canPlay(url)) {
      toast({
        title: 'Could not add to queue',
        description: 'Invalid URL detected'
      });
      return;
    }

    fetch(`${API_ENDPOINT}/sync/rooms/${roomid}/queue`, {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({
        add: url
      })
    })
      .then(fetchGetJson)
      .catch(() => {
        toast({
          title: 'Error adding to queue',
          description: 'Please try again later'
        });
      })
      .finally(() => media_queue.current!.value = '');
  }

  const queueRemove = (index: string) => {
    console.log(`remove ${index}`);

    fetch(`${API_ENDPOINT}/sync/rooms/${roomid}/queue`, {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({
        remove: index.toString()
      })
    })
      .then(fetchGetJson)
      .catch(() => {
        toast({
          title: 'Error removing from queue',
          description: 'Please try again later'
        });
      })
  }

  return (
    <Flex className='items-start justify-center min-h-screen'>
      <Flex className='mt-16 md:mt-40 mb-8 mx-12 items-end justify-center gap-12 flex-wrap-reverse'>
        {/* Chat */}
        <ChatBox roomid={roomid} users={room.users} messages={room.meta.messages} />

        {/* Media Player */}
        <Flex className='flex-col gap-2 max-w-[min(80vw,_600px)]'>
          {/* Player */}
          <ReactPlayer
            style={{backgroundColor: 'var(--gray-2)', outline: 'none'}}
            width={'min(80vw, 600px)'}
            ref={player}
            url={room.meta.queue[0]?.substring(room.meta.queue[0].indexOf(':') + 1)}
            playing={room.meta.playing}
            muted={true}
            controls={true}
            pip={false}

            onReady={onReady}
            onPlay={onPlay}
            onPause={onPause}

            onEnded={onFinished}
            onError={(e) => console.log(e)}
          />

          {/* URL Entry */}
          <TextField.Root
            ref={media_queue}
            className='w-full'
            placeholder='Enter media url...'
            onKeyDown={(e) => e.key === 'Enter' && queueAdd()}
          >
            <TextField.Slot side='right'>
              <IconButton
                variant='ghost'
                onClick={queueAdd}
              >
                <PlusIcon />
              </IconButton>
            </TextField.Slot>
          </TextField.Root>

          {/* Media Queue */}
          {
            !!room.meta.queue.length && (
              <Card className='flex flex-col p-2 gap-2 items-stretch justify-center'>
                <Text className='text-sm text-center'>Media Queue</Text>
                <Separator size='4' />
                {room.meta.queue.map((entry, i) => (
                  <Flex key={entry.split(':')[0]} className='items-center justify-evenly gap-2'>
                    <Link 
                      className='text-xs text-center break-all'
                      href={entry.substring(entry.indexOf(':') + 1)}
                    >
                      {i + 1}. {entry.substring(entry.indexOf(':') + 1)}
                    </Link>

                    <IconButton 
                      variant='outline' 
                      size='1'
                      onClick={() => queueRemove(entry.split(':')[0])}
                    >
                      <Cross1Icon />
                    </IconButton>
                  </Flex>
                ))}
              </Card>
            )
          }
        </Flex>
      </Flex>
    </Flex>
  );
}

export default SyncRoom;
