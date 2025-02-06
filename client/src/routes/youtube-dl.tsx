import { MagnifyingGlassIcon } from '@radix-ui/react-icons';
import {
  Flex,
  IconButton,
  Link,
  Text,
  TextField,
  Card,
  Separator,
  Select,
  Button,
  Tooltip
} from '@radix-ui/themes';
import { useEffect, useState } from 'react';
import { API_ENDPOINT } from '../env';
import { fetchGetJson } from '../lib/util';
import { type Payload } from 'youtube-dl-exec';
import { useToast } from '../hooks/use-toast';

// Payload doesn't include like_count (bug)
type VideoPayload = Payload & { like_count: number };

function VideoDownloader({ info }: { info?: VideoPayload }) {
  const { toast } = useToast();

  const [format, setFormat] = useState<string>();
  const [downloading, setDownloading] = useState<boolean>(false);

  useEffect(() => {
    setFormat(undefined);
    setDownloading(false);
  }, [info?.original_url]);

  if (!info) {
    return null;
  }

  const downloadVideo = () => {
    if (!format) {
      toast({
        title: 'Could not download media',
        description: 'Please select a valid format'
      });

      return;
    }

    setDownloading(true);

    const url = new URL(`${API_ENDPOINT}/tools/youtube-dl/`);

    const params = new URLSearchParams({
      query: info.original_url,
      format: format
    });

    url.search = params.toString();

    window.location.href = url.toString();

    setTimeout(() => setDownloading(false), 2_500);
  };

  return (
    <Flex className='flex-col gap-2'>
      <Select.Root onValueChange={setFormat}>
        <Select.Trigger
          placeholder='Select video format & quality...'
          className='w-72'
        />

        <Select.Content>
          <Select.Group>
            <Select.Label>MP4</Select.Label>
            {info.formats
              .filter((fmt) => fmt.format_note && fmt.vcodec.startsWith('avc'))
              .map((fmt) => (
                <Select.Item key={fmt.format_id} value={fmt.format_id}>
                  {fmt.format_note!} ({fmt.format_id})
                </Select.Item>
              ))}
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

function VideoPreview({ info }: { info?: VideoPayload }) {
  if (!info) {
    return null;
  }

  const videoDate = () => {
    const year = +info.upload_date.substring(0, 4);
    const month = +info.upload_date.substring(4, 6) - 1;
    const day = +info.upload_date.substring(6, 8);

    const date = new Date(year, month, day);

    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const compactNumber = (num: number) => {
    return Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(num);
  };

  return (
    <Card className='flex p-4 items-stretch justify-center gap-4 max-w-[80vw] flex-wrap mb-8'>
      <img
        className='w-96 object-contain rounded-lg'
        src={info.thumbnail}
        alt='Youtube video thumbnail'
      />

      <Flex className='gap-4 flex-col max-w-[30rem] justify-between'>
        <Flex className='gap-2 flex-col'>
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
              {videoDate()}
            </Text>
          </Flex>

          <Flex className='gap-2 items-center'>
            <Tooltip content={info.view_count.toLocaleString('en-US')}>
              <Text className='text-sm' color='gray'>
                {compactNumber(info.view_count)} views
              </Text>
            </Tooltip>
            <Separator orientation='vertical' />
            <Tooltip content={info.like_count.toLocaleString('en-US')}>
              <Text className='text-sm' color='gray'>
                {compactNumber(info.like_count)} likes
              </Text>
            </Tooltip>
          </Flex>
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
  const [videoInfo, setVideoInfo] = useState<VideoPayload>();

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

    fetch(`${API_ENDPOINT}/tools/media-info?query=${query.trim()}`, {
      credentials: 'include'
    })
      .then(fetchGetJson)
      .then((data) => setVideoInfo(data['data']))
      .catch(() => {
        toast({
          title: 'Error looking up video',
          description:
            "Make sure video exists and isn't private or age/region restricted"
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
      <Text className='mt-[20vh] text-3xl'>Youtube Downloader</Text>

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
