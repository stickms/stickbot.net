import { GearIcon, PlusIcon } from "@radix-ui/react-icons";
import { Flex, IconButton, TextField, AspectRatio, DropdownMenu, Dialog, Button, Select } from "@radix-ui/themes";
import ReactPlayer from "react-player";
import { useEffect, useRef, useState } from "react";
import useToast from "../hooks/use-toast";
import MediaQueue from "./media-queue";
import { arrayMove } from "@dnd-kit/sortable";
import { useStore } from "@nanostores/react";
import { $syncsettings, setHideChat } from "../lib/store";
import { SyncRoomQueue } from "../lib/types";
import SocketConn from "../lib/socket";

type MediaPlayerProps = {
  socket: SocketConn;
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

  function mediaPlay(curtime?: number) {
    if (!player.current) {
      return;
    }

    const meta = { playing, curtime }

    editRoomMeta({
      playing: true,
      curtime: curtime ?? Math.floor(player.current.getCurrentTime())
    });

    socket.send({
      command: 'play',
      curtime: curtime ?? Math.floor(player.current.getCurrentTime())
    }, undefined, () => { editRoomMeta(meta) });
  };

  function mediaPause(curtime?: number) {
    if (!player.current) {
      return;
    }

    const meta = { playing, curtime }

    editRoomMeta({
      playing: false,
      curtime: curtime ?? Math.floor(player.current.getCurrentTime())
    });

    socket.send({
      command: 'pause',
      curtime: curtime ?? Math.floor(player.current.getCurrentTime())
    }, undefined, () => { editRoomMeta(meta) });
  };

  function onReady(player: ReactPlayer) {
    if (!ready) {
      setReady(true);
      player.seekTo(curtime, 'seconds');
    }
  };

  function onPlay() {
    if (!player.current || playing) {
      return;
    }

    mediaPlay();
  };

  function onPause() {
    if (!player.current || !playing) {
      return;
    }

    mediaPause();
  };

  function onFinished() {
    console.log('finished');

    if (!player.current || !player.current.getCurrentTime()) {
      return;
    }

    player.current.seekTo(0);
    queueRemove(queue[0]?.id);
  }

  function serverRespHandler(title: string) {
    return [
      () => setQueueDirty(false),
      () => {
        toast({
          title,
          description: 'Please try again later'
        });

        setQueueDirty(false);
      }
    ];
  }

  function queueAdd() {
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

    socket.send({
      command: 'queue',
      add: url
    }, ...serverRespHandler('Could not add item to queue'));

    media_queue_input.current!.value = ''
  }

  function queueRemove(id: string) {
    setQueueDirty(true);

    if (queue[0].id === id) {
      player.current?.seekTo(0);
      if (playing) {
        mediaPlay(0);
      } else {
        mediaPause(0);
      }
    }

    socket.send({
      command: 'queue',
      remove: id.toString()
    }, ...serverRespHandler('Could not remove item from queue'));
  }

  function queueClear() {
    setQueueDirty(true);

    mediaPause(0);

    socket.send({
      command: 'queue',
      clear: true
    }, ...serverRespHandler('Could not clear queue'));
  }

  function queueOrder(from: number, to: number) {
    setQueueDirty(true);

    if (to === 0 || from === 0) {
      player.current?.seekTo(0);
      if (playing) {
        mediaPlay(0);
      } else {
        mediaPause(0);
      }
    }

    socket.send({
      command: 'queue',
      order: arrayMove(queue.map((_, i) => i), from, to)
    }, ...serverRespHandler('Could not reorder queue'));
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
        <SyncSettings socket={socket} />

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
        queueClear={queueClear}
      />
    </Flex>
  );
}

function SyncSettings({ socket }: { socket: SocketConn }) {
  const { toast } = useToast();

  const syncsettings = useStore($syncsettings);
  const bg_input = useRef<HTMLInputElement>(null);

  const [ bgSize, setBgSize ] = useState<string>('fill');

  const changeBackground = () => {
    if (!bg_input.current) {
      return;
    }

    const value = bg_input.current.value.trim();

    if (value.length && !URL.parse(value)) {
      toast({
        title: 'Could not change background',
        description: 'Please enter a valid URL'
      });
      return;
    }

    socket.send({
      command: 'background',
      background: {
        url: value,
        size: bgSize
      },
    });
  };

  return (
    <Dialog.Root>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          <IconButton variant='surface'>
            <GearIcon />
          </IconButton>
        </DropdownMenu.Trigger>

        <DropdownMenu.Content>
          {/* Hide Chat toggle */}
          <DropdownMenu.CheckboxItem
            onClick={() => setHideChat(!syncsettings.hide_chat)}
            checked={syncsettings.hide_chat}
          >
            Hide Chat
          </DropdownMenu.CheckboxItem>

          {/* Change Background Trigger */}
          <Dialog.Trigger>
            <DropdownMenu.Item>
              Change Background
            </DropdownMenu.Item>
          </Dialog.Trigger>
        </DropdownMenu.Content>
      </DropdownMenu.Root>

      <Dialog.Content className='w-96 max-w-[80vw]'>
        <Dialog.Title>Change Background</Dialog.Title>
        <Dialog.Description>
          Please enter a direct image url, or leave input box empty to clear
        </Dialog.Description>
        <Flex className='mt-4 gap-3 flex-col'>
          <TextField.Root ref={bg_input} className='w-full'/>
          <Select.Root value={bgSize} onValueChange={setBgSize}>
            <Select.Trigger className='w-32' />
            <Select.Content>
              <Select.Group>
                <Select.Label>Image Settings</Select.Label>
                <Select.Item value='default'>Default Size</Select.Item>
                <Select.Item value='fill'>Fill</Select.Item>
                <Select.Item value='stretch'>Stretch to Fill</Select.Item>
              </Select.Group>
            </Select.Content>
          </Select.Root>
          <Flex className='gap-4 justify-end'>
            <Dialog.Close>
              <Button color='gray'>
                Cancel
              </Button>
            </Dialog.Close>
            <Dialog.Trigger>
              <Button onClick={() => changeBackground()}>
                Change
              </Button>
            </Dialog.Trigger>
          </Flex>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}

export default MediaPlayer;
