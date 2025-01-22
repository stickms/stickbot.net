import { GearIcon, PlusIcon } from "@radix-ui/react-icons";
import { Flex, IconButton, TextField, AspectRatio, DropdownMenu } from "@radix-ui/themes";
import ReactPlayer from "react-player";
import { useEffect, useRef, useState } from "react";
import useToast from "../hooks/use-toast";
import MediaQueue from "./media-queue";
import { arrayMove } from "@dnd-kit/sortable";
import { useStore } from "@nanostores/react";
import { $syncsettings, setHideChat } from "../lib/store";
import { SyncRoomQueue } from "../lib/types";

type MediaPlayerProps = {
  socket: WebSocket;
  playing: boolean;
  curtime: number;
  queue: SyncRoomQueue;
  editRoomMeta: (meta: object) => void
};

function MediaPlayer({
  socket, playing, curtime, queue, editRoomMeta
}: MediaPlayerProps
) {
  const syncsettings = useStore($syncsettings);
  const { toast } = useToast();

  const player = useRef<ReactPlayer>(null);
  const media_queue_input = useRef<HTMLInputElement>(null);

  const [ ready, setReady ] = useState<boolean>(false);
  const [ queueDirty, setQueueDirty ] = useState<boolean>(false);

  useEffect(() => {
    if (!player.current) {
      return;
    }

    if (Math.abs(player.current.getCurrentTime() - curtime) <= 2.5) {
      return;
    }

    player.current.seekTo(curtime, 'seconds');
  }, [ player, curtime ]);

  useEffect(() => {
    setQueueDirty(false);
  }, [ queue ]);

  const mediaPlay = (curtime?: number) => {
    if (!player.current) {
      return;
    }

    editRoomMeta({
      playing: true,
      curtime: curtime ?? Math.floor(player.current.getCurrentTime())
    });

    socket.send(JSON.stringify({
      command: 'play',
      curtime: curtime ?? Math.floor(player.current.getCurrentTime())
    }));
  };

  const mediaPause = (curtime?: number) => {
    if (!player.current) {
      return;
    }

    editRoomMeta({
      playing: false,
      curtime: curtime ?? Math.floor(player.current.getCurrentTime())
    });

    socket.send(JSON.stringify({
      command: 'pause',
      curtime: curtime ?? Math.floor(player.current.getCurrentTime())
    }));
  };

  const onReady = (player: ReactPlayer) => {
    if (!ready) {
      setReady(true);
      player.seekTo(curtime, 'seconds');
    }
  };

  const onPlay = () => {
    if (!player.current || playing) {
      return;
    }

    mediaPlay();
  };

  const onPause = () => {
    if (!player.current || !playing) {
      return;
    }

    mediaPause();
  };

  const onFinished = () => {
    console.log('finished');

    if (!player.current || !player.current.getCurrentTime()) {
      return;
    }

    player.current.seekTo(0);
    queueRemove(queue[0]?.id);
  }

  const queueAdd = () => {
    if (!media_queue_input.current) {
      return;
    }

    const url = media_queue_input.current.value.trim();

    if (!url || !URL.parse(url) || !ReactPlayer.canPlay(url)) {
      toast({
        title: 'Could not add to queue',
        description: 'Invalid URL detected'
      });
      return;
    }

    setQueueDirty(true);

    socket.send(JSON.stringify({
      command: 'queue',
      add: url
    }));

    media_queue_input.current!.value = ''
  }

  const queueRemove = (id: string) => {
    setQueueDirty(true);

    if (queue[0].id === id) {
      player.current?.seekTo(0);
      if (playing) {
        mediaPlay(0);
      } else {
        mediaPause(0);
      }
    }

    socket.send(JSON.stringify({
      command: 'queue',
      remove: id.toString()
    }));
  }

  const queueOrder = (from: number, to: number) => {
    setQueueDirty(true);

    if (to === 0 || from === 0) {
      player.current?.seekTo(0);
      if (playing) {
        mediaPlay(0);
      } else {
        mediaPause(0);
      }
    }

    socket.send(JSON.stringify({
      command: 'queue',
      order: arrayMove(queue.map((_, i) => i), from, to)
    }));
  }

  return (
    <Flex
      className='flex-col gap-2 min-w-[min(600px,_85vw)] max-w-[85vw]'
      width={syncsettings.hide_chat ? '60vw' : '50vw'}
    >
      {/* Player */}
      <AspectRatio ratio={16 / 9}>
        <ReactPlayer
          style={{backgroundColor: 'var(--gray-2)', outline: 'none'}}
          width={'100%'}
          height={'100%'}
          ref={player}
          url={queue[0]?.url}
          playing={playing}
          muted={true}
          controls={true}
          pip={false}

          playbackRate={1.0}
          light={false}
          loop={false}

          onReady={onReady}
          onPlay={onPlay}
          onPause={onPause}

          onEnded={onFinished}
          onError={(e) => console.log(e)}
        />
      </AspectRatio>

      {/* Settings & URL Entry */}
      <Flex className='w-full items-center justify-between gap-2'>
        {/* Settings dropdown */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            <IconButton variant='surface'>
              <GearIcon />
            </IconButton>
          </DropdownMenu.Trigger>

          <DropdownMenu.Content>
            <DropdownMenu.CheckboxItem
              onClick={(e) => {
                e.preventDefault()
                setHideChat(!syncsettings.hide_chat);
              }}
              checked={syncsettings.hide_chat}
            >
              Hide Chat
            </DropdownMenu.CheckboxItem>
          </DropdownMenu.Content>
        </DropdownMenu.Root>

        <TextField.Root
          ref={media_queue_input}
          className='flex-grow'
          placeholder='Enter media url...'
          onKeyDown={(e) => e.key === 'Enter' && queueAdd()}
          disabled={queueDirty}
        >
          {/* Add media button */}
          <TextField.Slot side='right'>
            <IconButton
              variant='ghost'
              onClick={queueAdd}
              loading={queueDirty}
            >
              <PlusIcon />
            </IconButton>
          </TextField.Slot>
        </TextField.Root>
      </Flex>
      {/* Media Queue */}
      <MediaQueue
        internalQueue={queue}
        queueRemove={queueRemove}
        queueOrder={queueOrder}
      />
    </Flex>
  );
}

export default MediaPlayer;
