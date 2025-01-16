import { Box, Card, Flex, IconButton, Link, ScrollArea, Separator, Text, TextField } from "@radix-ui/themes";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { type SyncRoom } from "../lib/types";
import { API_ENDPOINT } from "../env";
import { fetchGetJson } from "../lib/util";
import { hc } from "hono/client";
import useAuth from "../hooks/use-auth";
import ReactPlayer from 'react-player';
import { Cross1Icon, PaperPlaneIcon, PlusIcon } from "@radix-ui/react-icons";
import useToast from "../hooks/use-toast";

function SyncRoom() {
  const { user } = useAuth();
  const { roomid } = useParams();
  const { toast } = useToast();

  const [room, setRoom] = useState<SyncRoom | null>();
  const [webSocket, setWebSocket] = useState<WebSocket>();

  const [playing, setPlaying] = useState<boolean>(false);

  const player = useRef<ReactPlayer>(null);
  const media_queue = useRef<HTMLInputElement>(null);
  const message_area = useRef<HTMLDivElement>(null);
  const chat_box = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const setupSocket = () => {
      const client = hc(`${API_ENDPOINT}/sync`);
      const socket = client.ws.$ws(0);

      socket.addEventListener('open', () => {
        socket.send(JSON.stringify({
          id: user.id,
          username: user.username,
          room: roomid
        }));

        socket.send(JSON.stringify({
          join: true,
          user: `${user.id}:${user.username}`
        }))
      });

      socket.addEventListener('message', (event: MessageEvent<string>) => {
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
      });

      return socket;
    };

    let socket: WebSocket | null = null;

    fetch(`${API_ENDPOINT}/sync/rooms/${roomid}`, {
      credentials: 'include'
    })
      .then(fetchGetJson)
      .then((data) => {
        setRoom(data['data']);
        setPlaying(!!data['data']['meta']?.['playing']);
        socket = setupSocket();
        setWebSocket(socket);

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
            console.log('changed playing');
            setPlaying(!!room_data.meta.playing);
          }

          if (message_area.current) {
            message_area.current.scrollTop = message_area.current.scrollHeight;
          }
        })
          .catch(() => setRoom(null));
    }, 15_000) // Every 15 seconds

    return () => {
      socket?.send(JSON.stringify({
        leave: true,
        user: user.id
      }))

      socket?.close();
    }
  }, [ roomid, user.id ]);
  
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

    webSocket?.send(JSON.stringify({
      play: true,
      curtime: Math.floor(player.current.getCurrentTime())
    }));
  };

  const onPause = () => {
    if (!player.current || !playing) {
      return;
    }

    setPlaying(false);

    webSocket?.send(JSON.stringify({
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
    <Flex className='items-center justify-center min-h-screen'>
      <Flex className='my-32 mx-[5vw] items-center justify-center gap-12 flex-wrap-reverse'>
        {/* Chat */}
        <Card className='flex flex-wrap w-[600px] max-w-[80vw] h-[400px] p-1'>
          {/* User List */}
          <Box className='h-[90%] basis-[33%] max-w-[150px] flex-shrink p-1 whitespace-pre-line'>
            <ScrollArea className='pr-3 pl-1' scrollbars='vertical' type='always'>
              {room.users.map((user) => (
                <Text className='text-sm break-all'>
                  {user.substring(user.indexOf(':')+1)}{'\n'}
                </Text>
              ))}
            </ScrollArea>
          </Box>

          {/* Messages */}
          <Box className='h-[90%] basis-[67%] p-1 flex-grow'>
            <ScrollArea ref={message_area} type='always' scrollbars='vertical' className='pr-3 whitespace-pre-line break-all'>
              {room.meta.messages.map((msg) => (
                <Text className='text-sm'>
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
            style={{backgroundColor: 'var(--gray-2)'}}
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
