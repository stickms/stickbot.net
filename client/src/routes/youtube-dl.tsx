import { MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { Avatar, Flex, IconButton, Link, Text, TextField, Card, Separator, Select, Button } from "@radix-ui/themes";
import { type videoInfo } from '@distube/ytdl-core';
import { useEffect, useState } from "react";
import { API_ENDPOINT } from "../env";
import { fetchGetJson } from "../lib/util";
import useToast from "../hooks/use-toast";

function VideoPreview({ info }: { info?: videoInfo }) {
  const { toast } = useToast();
  const [ format, setFormat ] = useState<string>();
  const [ downloading, setDownloading ] = useState<boolean>(false);

  useEffect(() => {
    setDownloading(false);
  }, [ info?.videoDetails.videoId ])

  if (!info) {
    return null;
  }

  const downloadVideo = async () => {
    if (!format) {
      toast({
        title: 'Could not download video',
        description: 'Please select a video format and try again'
      });

      return;
    }

    setDownloading(true);

    const url = new URL(`${API_ENDPOINT}/tools/youtube-dl`);
    const params = new URLSearchParams({
      query: info.videoDetails.videoId,
      itag: format,
    });

    url.search = params.toString();

    fetch(url, {
      method: 'GET',
      credentials: 'include'
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error();
        }

        return res.blob()
      })
      .then((blob) => {
        const a = document.createElement('a');
        a.href = window.URL.createObjectURL(blob);
        a.download = `video.mp4`;
        document.body.appendChild(a);
        a.click();    
        a.remove();
      })
      .catch((e) => console.log(e))
      .finally(() => setDownloading(false));
  }

  const video_formats = [ 'mp4' ];

  return (
    <Card className='flex p-4 items-start justify-center gap-4 max-w-[80vw] flex-wrap mb-8'>
      <img
        className='w-96 h-54 object-contain rounded-lg'
        src={info.videoDetails.thumbnails.slice(-1)[0].url}
        alt='Youtube video thumbnail'
      />

      <Flex className='gap-2 flex-col max-w-[30rem]'>
        <Text className='text-xl'>
          {info.videoDetails.title}
        </Text>
        <Flex className='gap-2 items-center'>
          <Avatar
            size='1'
            src={info.videoDetails.author.thumbnails?.slice(-1)[0].url}
            fallback={'A'}
            radius='full'
          />
          <Link 
            href={info.videoDetails.author.channel_url}
            target='_blank'
            rel='noopener noreferrer'
            highContrast
            color='gray'
            underline='hover'
          >
            {info.videoDetails.author.name}
          </Link>
          <Separator orientation='vertical' />
          <Text className='text-sm' color='gray'>
            {(new Date(info.videoDetails.uploadDate)).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </Text>
        </Flex>

        <Select.Root onValueChange={setFormat}>
          <Select.Trigger 
            placeholder='Select video format & quality...'
            className='w-72 mt-8'
          />
          <Select.Content>
            {
              video_formats.map((format) => {
                return (
                  <Select.Group key={format}>
                    <Select.Label>
                      {format.toUpperCase()}
                    </Select.Label>
                    {
                      info.formats
                        .filter((fmt) => fmt.hasVideo)
                        .filter((fmt, index, array) => array.findIndex((f) => f.qualityLabel === fmt.qualityLabel) === index)
                        .map((fmt) => {
                        return (
                          <Select.Item
                            key={fmt.itag.toString()}
                            value={fmt.itag.toString()}
                          >
                            {fmt.qualityLabel}
                          </Select.Item>
                        );
                      })
                    }
                  </Select.Group>
                );
              })
            }
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
    </Card>
  );
}

function YoutubeDl() {
  const { toast } = useToast();

  const [query, setQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [videoInfo, setVideoInfo] = useState<videoInfo>();

  const handleSearch = () => {
    if (!query) {
      toast({
        title: 'Error looking up video',
        description: 'Please specify a search query'
      });

      return;
    }

    setVideoInfo(() => undefined);
    setLoading(() => true);

    fetch(`${API_ENDPOINT}/tools/youtube-info?query=${query}`, 
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
          placeholder='Enter video url/id...'
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
