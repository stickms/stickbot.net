import { PlusIcon } from "@radix-ui/react-icons";
import { Flex, IconButton, TextField, AspectRatio } from "@radix-ui/themes";
import ReactPlayer from "react-player";
import { SyncRoom } from "../lib/types";
import { useEffect, useRef, useState } from "react";
import useToast from "../hooks/use-toast";
import MediaQueue from "./media-queue";
import { arrayMove } from "@dnd-kit/sortable";

type MediaPlayerProps = {
  socket: WebSocket;
  playing: boolean;
  curtime: number;
  queue: string[];
  setRoom: React.Dispatch<React.SetStateAction<SyncRoom | undefined>>
};

function MediaPlayer({
  socket, playing, curtime, queue, setRoom
}: MediaPlayerProps
) {
  const { toast } = useToast();

  const player = useRef<ReactPlayer>(null);
  const media_queue_input = useRef<HTMLInputElement>(null);

  const [ready, setReady] = useState<boolean>(false);

  useEffect(() => {
    if (!player.current) {
      return;
    }

    if (Math.abs(player.current.getCurrentTime() - curtime) <= 2.5) {
      return;
    }

    player.current.seekTo(curtime, 'seconds');
  }, [ player, curtime ]);

  const mediaPlay = (curtime?: number) => {
    if (!player.current) {
      return;
    }

    setRoom((rm) => !rm ? rm : {
      ...rm,
      meta: {
        ...rm.meta,
        playing: true,
        curtime: curtime ?? Math.floor(player.current!.getCurrentTime())
      }
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

    setRoom((rm) => !rm ? rm : {
      ...rm,
      meta: {
        ...rm.meta,
        playing: false,
        curtime: curtime ?? Math.floor(player.current!.getCurrentTime())
      }
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
    queueRemove(queue[0]?.split(':')[0]);
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

    socket.send(JSON.stringify({
      command: 'queue',
      add: url
    }));

    media_queue_input.current!.value = ''
  }

  const queueRemove = (index: string) => {
    if (queue[0].startsWith(index)) {
      player.current?.seekTo(0);
      if (playing) {
        mediaPlay(0);
      } else {
        mediaPause(0);
      }
    }

    socket.send(JSON.stringify({
      command: 'queue',
      remove: index.toString()
    }));
  }

  const queueOrder = (from: number, to: number) => {
    if (to === 0) {
      player.current?.seekTo(0);
      if (playing) {
        mediaPlay(0);
      } else {
        mediaPause(0);
      }
    }

    socket.send(JSON.stringify({
      command: 'queue',
      order: arrayMove(queue, from, to)
    }));
  }

  return (
    <Flex className='flex-col gap-2 w-[50vw] min-w-[min(600px,_85vw)] max-w-[85vw]'>
      {/* Player */}
      <AspectRatio ratio={16 / 9}>
        <ReactPlayer
          style={{backgroundColor: 'var(--gray-2)', outline: 'none'}}
          width={'100%'}
          height={'100%'}
          ref={player}
          url={queue[0]?.substring(queue[0].indexOf(':') + 1)}
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

      {/* URL Entry */}
      <TextField.Root
        ref={media_queue_input}
        className='w-full'
        placeholder='Enter media url...'
        onKeyDown={(e) => e.key === 'Enter' && queueAdd()}
      >
        {/* Add media button */}
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
      <MediaQueue
        internalQueue={queue}
        queueRemove={queueRemove}
        queueOrder={queueOrder}
      />
    </Flex>
  );
}

export default MediaPlayer;
