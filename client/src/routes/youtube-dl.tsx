import { MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { Flex, IconButton, Link, Text, TextField, Card, Separator, Select, Button } from "@radix-ui/themes";
import { useEffect, useState } from "react";
import { API_ENDPOINT } from "../env";
import { fetchGetJson } from "../lib/util";
import { type Payload } from 'youtube-dl-exec';
import useToast from "../hooks/use-toast";

function VideoDownloader({ info }: { info?: Payload }) {
  const { toast } = useToast();

  const [ format, setFormat ] = useState<string>();
  const [ downloading, setDownloading ] = useState<boolean>(false);

  useEffect(() => {
    setFormat(undefined);
    setDownloading(false);
  }, [ info?.original_url ]);

  if (!info) {
    return null;
  }

  const downloadVideo = () => {
    if(!format) {
      toast({
        title: 'Could not download video',
        description: 'Please select a video format'
      });

      return;
    }

    setDownloading(true);

    const url = new URL(`${API_ENDPOINT}/tools/youtube-dl/`);

    const params = new URLSearchParams({
      query: info.original_url,
      format: format!
    });

    url.search = params.toString();

    fetch(url,
      { credentials: 'include' }
    )
      .then((resp) => {
        if (!resp.ok) {
          throw new Error();
        }

        return resp.blob();
      })
      .then((blob) => {
        const a = document.createElement('a');
        a.href = window.URL.createObjectURL(blob);
        a.download = `video.mp4`;
        document.body.appendChild(a);
        a.click();    
        a.remove();
      })
      .catch((e) => {
        console.log(e);
        toast({
          title: 'Error when downloading video',
          description: 'Please try again later'
        })
      })
      .finally(() => setDownloading(false));
  }

  return (
    <Flex className='flex-col gap-2'>
      <Select.Root
        onValueChange={setFormat}
      >
        <Select.Trigger 
          placeholder='Select video format & quality...'
          className='w-72 mt-8'
        />

        <Select.Content>
          <Select.Group>
            <Select.Label>
              MP4
            </Select.Label>
            {
              info.formats
                .filter((fmt) => fmt.format_note && fmt.vcodec.startsWith('avc'))
                .map((fmt) => {
                  return (
                    <Select.Item key={fmt.format_id} value={fmt.format_id}>
                      {fmt.format_note!}
                    </Select.Item>
                  );
                })
            }
          </Select.Group>
        </Select.Content>

      </Select.Root>

      <Button
          className='w-40'
          onClick={downloadVideo}
          disabled={downloading}
          loading={downloading}
        >
          Download Video
        </Button>
    </Flex>
  );
}

function VideoPreview({ info }: { info?: Payload }) {
  if (!info) {
    return null;
  }

  return (
    <Card className='flex p-4 items-start justify-center gap-4 max-w-[80vw] flex-wrap mb-8'>
      <img
        className='w-96 h-54 object-contain rounded-lg'
        src={info.thumbnail}
        alt='Youtube video thumbnail'
      />

      <Flex className='gap-2 flex-col max-w-[30rem]'>
        <Link
          className='text-xl'
          href={info.original_url}
          target='_blank'
          rel='noopener noreferrer'
          highContrast
          color='gray'
          underline='hover'
        >
          {info.title}
        </Link>
        <Flex className='gap-2 items-center'>
          {/* <Avatar
            size='1'
            src={info.videoDetails.author.thumbnails?.slice(-1)[0].url}
            fallback={'A'}
            radius='full'
          /> */}
          <Link 
            href={info.channel_url}
            target='_blank'
            rel='noopener noreferrer'
            highContrast
            color='gray'
            underline='hover'
          >
            {info.channel}
          </Link>
          <Separator orientation='vertical' />
          <Text className='text-sm' color='gray'>
            {(new Date(info.upload_date)).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </Text>
        </Flex>

        <VideoDownloader info={info} />
      </Flex>
    </Card>
  );
}

function YoutubeDl() {
  const { toast } = useToast();

  const [query, setQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [videoInfo, setVideoInfo] = useState<Payload>();

  const handleSearch = () => {
    if (!query.trim()) {
      toast({
        title: 'Error looking up video',
        description: 'Please specify a search query'
      });

      return;
    }

    setVideoInfo(() => undefined);
    setLoading(() => true);

    fetch(`${API_ENDPOINT}/tools/youtube-info?query=${query.trim()}`, 
      { credentials: 'include' }
    )
      .then(fetchGetJson)
      .then((data) => setVideoInfo(data['data']))
      .catch(() => {
        toast({
          title: 'Error looking up video',
          description: 'Make sure video exists and isn\'t private or age/region restricted'
        });
      })
      .finally(() => setLoading(() => false));
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.stopPropagation();
      handleSearch();
    }
  };

  return (
    <Flex className='items-center justify-center flex-col gap-y-24'>
      <Text className='mt-[20vh] text-3xl'>Youtube Video Downloader</Text>

      <Flex className='items-center justify-center gap-4'>
        <TextField.Root 
          className='w-96 max-w-[80vw]'
          placeholder='Enter video url...'
          maxLength={128}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyPress}
          disabled={loading}
        >
          <TextField.Slot side='right'>
            <IconButton variant='ghost' onClick={handleSearch}>
              <MagnifyingGlassIcon />
            </IconButton>
          </TextField.Slot>
        </TextField.Root>
      </Flex>

      <VideoPreview info={videoInfo} />
    </Flex>
  );
}

export default YoutubeDl;
