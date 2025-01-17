import { Box, Card, Flex, IconButton, Link, ScrollArea, Separator, Text, TextField } from "@radix-ui/themes";
import { MutableRefObject, useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
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
  });

  setSocket(socket);
}

function SyncRoom() {
  const { user } = useAuth();
  const { roomid } = useParams();
  const { toast } = useToast();

  const webSocket = useRef<WebSocket | null>(null);
  const [room, setRoom] = useState<SyncRoom | null>();

  const [playing, setPlaying] = useState<boolean>(false);

  const player = useRef<ReactPlayer>(null);
  const media_queue = useRef<HTMLInputElement>(null);
  const message_area = useRef<HTMLDivElement>(null);
  const chat_box = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`${API_ENDPOINT}/sync/rooms/${roomid}`, {
      credentials: 'include'
    })
      .then(fetchGetJson)
      .then((data) => {
        setRoom(data['data']);
        setPlaying(!!data['data']['meta']?.['playing']);
        
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
                  messages: [...rm.meta.messages, message.chat ]
                }
              });
            }
    
            if (message.join) {
              setRoom((rm) => !rm ? rm : {
                ...rm,
                users: [ ...rm.users, message.user ]
              });
            }
    
            if (message.leave) {
              setRoom((rm) => !rm ? rm : {
                ...rm,
                users: rm.users.filter((user) => !user.startsWith(message.user))
              });
            }
    
            if (message.queue_add) {
              setRoom((rm) => !rm ? rm : {
                ...rm,
                meta: {
                  ...rm.meta,
                  queue: [ ...rm.meta.queue, message.queue_add ]
                }
              });
            }
    
            if (message.queue_remove) {
              setRoom((rm) => !rm ? rm : {
                ...rm,
                meta: {
                  ...rm.meta,
                  queue: rm.meta.queue.filter((_,i) => i !== +message.queue_remove)
                }
              });
            }
    
            // We don't need to adhere to our own play/pause messages
            if (message.source !== user.id) {
              if (message.play) {
                setPlaying(true);
                player.current?.seekTo(message.curtime, 'seconds');
              }
    
              if (message.pause) {
                setPlaying(false);
                player.current?.seekTo(message.curtime, 'seconds');
              }
            }    
          }
        )

        if (message_area.current) {
          message_area.current.scrollTop = message_area.current.scrollHeight;
        }
      })
      .catch(() => {
        setRoom(null);
      });

    // "Heartbeat" - periodically check server status in case we get desynced
    setInterval(() => {
      fetch(`${API_ENDPOINT}/sync/rooms/${roomid}`, {
        credentials: 'include'
      })
        .then(fetchGetJson)
        .then((data) => {
          const room_data: SyncRoom = data['data'];
          setRoom(room_data);

          if (player.current && room_data.meta.playing) {
            if (Math.abs(room_data.meta.curtime - player.current?.getCurrentTime()) > 2.5) {
              player.current.seekTo(room_data.meta.curtime)
            }  
          }

          if (playing !== room_data.meta.playing) {
            setPlaying(!!room_data.meta.playing);
          }

          if (message_area.current) {
            message_area.current.scrollTop = message_area.current.scrollHeight;
          }
        })
          .catch(() => setRoom(null));
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
  
  if (room === null) {
    return (
      <Flex className='items-center justify-center min-h-screen'>
        <Text className='text-3xl'>Room Not Found</Text>
      </Flex>
    );
  }

  if (!room) {
    return null;
  }

  const onReady = (player: ReactPlayer) => {
    if (room.meta.curtime) {
      player.seekTo(room.meta.curtime, 'seconds');
    }
  };

  const onPlay = () => {
    if (!player.current || playing) {
      return;
    }

    setPlaying(true);

    webSocket.current?.send(JSON.stringify({
      play: true,
      curtime: Math.floor(player.current.getCurrentTime())
    }));
  };

  const onPause = () => {
    if (!player.current || !playing) {
      return;
    }

    setPlaying(false);

    webSocket.current?.send(JSON.stringify({
      pause: true,
      curtime: Math.floor(player.current.getCurrentTime())
    }));
  };

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

  const queueRemove = (index: number) => {
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
    <Flex className='items-start justify-center min-h-screen'>
      <Flex className='mt-16 md:mt-40 mb-8 mx-12 items-end justify-center gap-12 flex-wrap-reverse'>
        {/* Chat */}
        <Card className='flex flex-wrap w-[600px] max-w-[80vw] h-[400px] p-1'>
          {/* User List */}
          <Box className='h-[90%] basis-[33%] max-w-[150px] flex-shrink p-1 whitespace-pre-line'>
            <ScrollArea className='pr-3 pl-1' scrollbars='vertical' type='always'>
              {room.users.map((user) => (
                <Text key={user} className='text-sm break-all'>
                  {user.substring(user.indexOf(':')+1)}{'\n'}
                </Text>
              ))}
            </ScrollArea>
          </Box>

          {/* Messages */}
          <Box className='h-[90%] basis-[67%] p-1 flex-grow'>
            <ScrollArea ref={message_area} type='always' scrollbars='vertical' className='pr-3 whitespace-pre-line break-all'>
              {room.meta.messages.map((msg, i) => (
                <Text key={i} className='text-sm'>
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

        {/* Media Player */}
        <Flex className='flex-col gap-2'>
          {/* Player */}
          <ReactPlayer
            style={{backgroundColor: 'var(--gray-2)', outline: 'none'}}
            width={'min(80vw, 600px)'}
            ref={player}
            url={room.meta.queue[0]}
            playing={playing}
            muted={true}
            controls={true}
            pip={false}

            onReady={onReady}
            onPlay={onPlay}
            onPause={onPause}
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
                  <Flex key={Math.random().toString()} className='items-center justify-evenly flex-grow'>
                    <Link 
                      className='text-xs text-center'
                      href={entry}
                    >
                      {i + 1}. {entry}
                    </Link>

                    <IconButton 
                      variant='outline' 
                      size='1'
                      onClick={() => queueRemove(i)}
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
