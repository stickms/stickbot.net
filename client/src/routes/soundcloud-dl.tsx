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
  Tooltip,
  Skeleton
} from '@radix-ui/themes';
import { useEffect, useRef, useState } from 'react';
import { API_ENDPOINT } from '../env';
import { fetchGetJson } from '../lib/util';
import { type Payload } from 'youtube-dl-exec';
import { useToast } from '../hooks/use-toast';
import { TypeAnimation } from 'react-type-animation';

// Payload doesn't include like_count (bug)
type MediaPayload = Payload & { like_count: number };

function MediaDownloader({ info }: { info?: MediaPayload }) {
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

  const downloadMedia = () => {
    if (!format) {
      toast({
        title: 'Could not download media',
        description: 'Please select a valid format'
      });

      return;
    }

    setDownloading(true);

    const extension = format.split(':')[0];

    const url = new URL(`${API_ENDPOINT}/tools/soundcloud-dl/`);

    const params = new URLSearchParams({
      query: info.original_url,
      ext: extension,
      format: format.split(':')[1]
    });

    url.search = params.toString();

    window.location.href = url.toString();

    setTimeout(() => setDownloading(false), 2_500);
  };

  // All possible file extensions from soundcloud
  const extensions = [...new Set(info.formats.map((fmt) => fmt.ext))];

  return (
    <Flex className='flex-col gap-2'>
      <Select.Root onValueChange={setFormat}>
        <Select.Trigger
          placeholder='Select format & quality...'
          className='w-72'
        />

        <Select.Content>
          {extensions.map((ext) => (
            <Select.Group key={ext}>
              <Select.Label>{ext.toUpperCase()}</Select.Label>
              {info.formats
                .filter((fmt) => fmt.ext === ext)
                .map((fmt) => (
                  <Select.Item
                    key={fmt.format_id}
                    value={`${ext}:${fmt.format_id}`}
                  >
                    {fmt.abr} kbps ({fmt.format_id})
                  </Select.Item>
                ))}
            </Select.Group>
          ))}
        </Select.Content>
      </Select.Root>

      <Button
        className='w-40'
        onClick={downloadMedia}
        disabled={downloading}
        loading={downloading}
      >
        Download Audio
      </Button>
    </Flex>
  );
}

function MediaPreview({ info }: { info?: MediaPayload }) {
  if (!info) {
    return (
      <Card className='flex items-stretch justify-center gap-4 max-w-[80vw] flex-wrap'>
        <Skeleton className='size-52' />

        <Flex className='gap-4 flex-col max-w-[30rem] justify-between'>
          <Flex className='gap-2 flex-col'>
            <Skeleton className='w-full h-7' />
            <Skeleton className='w-full h-6' />
            <Skeleton className='w-full h-5' />
          </Flex>

          <Flex className='flex-col gap-2'>
            <Skeleton className='w-72 h-8' />
            <Skeleton className='w-40 h-8' />
          </Flex>
        </Flex>
      </Card>
    );
  }

  const uploadDate = () => {
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
    <Card className='flex p-4 items-stretch justify-center gap-4 max-w-[80vw] flex-wrap'>
      <img
        className='h-52 object-contain rounded-lg'
        src={info.thumbnail}
        alt='Thumbnail art'
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
              href={info.uploader_url}
              target='_blank'
              rel='noopener noreferrer'
              highContrast
              color='gray'
              underline='hover'
            >
              {info.uploader}
            </Link>
            <Separator orientation='vertical' />
            <Text className='text-sm' color='gray'>
              {uploadDate()}
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

        <MediaDownloader info={info} />
      </Flex>
    </Card>
  );
}

function SoundcloudDl() {
  const { toast } = useToast();

  const url_input = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [mediaInfo, setMediaInfo] = useState<MediaPayload>();

  const handleSearch = () => {
    if (!url_input.current) {
      return;
    }

    const query = url_input.current.value.trim();

    if (!query) {
      toast({
        title: 'Error looking up soundcloud link',
        description: 'Please specify a search query'
      });

      return;
    }

    setMediaInfo(() => undefined);
    setLoading(() => true);

    fetch(`${API_ENDPOINT}/tools/media-info?query=${query}`, {
      credentials: 'include'
    })
      .then(fetchGetJson)
      .then((data) => {
        const payload: MediaPayload = data['data'];

        if (
          payload.webpage_url_domain !== 'soundcloud.com' ||
          payload._type !== 'video'
        ) {
          throw new Error();
        }

        setMediaInfo(payload);
      })
      .catch(() => {
        toast({
          title: 'Error looking up link',
          description:
            "Make sure link exists and isn't private or age/region restricted"
        });
      })
      .finally(() => setLoading(() => false));
  };

  return (
    <Flex className='items-center min-h-screen flex-col gap-y-24 pt-40 pb-16'>
      <Text className='text-3xl text-center font-[Bipolar] h-8'>
        <TypeAnimation
          sequence={[100, 'SOUNDCLOUD DOWNLOADER']}
          cursor={false}
        />
      </Text>
      <Flex className='items-center justify-center gap-4'>
        <TextField.Root
          ref={url_input}
          className='w-96 max-w-[80vw]'
          placeholder='Enter Soundcloud url...'
          maxLength={128}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          disabled={loading}
        >
          <TextField.Slot side='right'>
            <IconButton variant='ghost' onClick={handleSearch}>
              <MagnifyingGlassIcon />
            </IconButton>
          </TextField.Slot>
        </TextField.Root>
      </Flex>

      <MediaPreview info={mediaInfo} />
    </Flex>
  );
}

export default SoundcloudDl;
