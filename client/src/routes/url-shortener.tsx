import { ArrowRightIcon, CopyIcon } from '@radix-ui/react-icons';
import {
  Flex,
  IconButton,
  Link,
  Select,
  Separator,
  Skeleton,
  Text,
  TextField,
  Tooltip
} from '@radix-ui/themes';
import { useRef, useState } from 'react';
import { API_ENDPOINT } from '../env';
import { fetchGetJson } from '../lib/util';
import { useToast } from '../hooks/use-toast';
import { TypeAnimation } from 'react-type-animation';

function UrlShortener() {
  const { toast } = useToast();

  const url_input = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [shortenedUrl, setShortenedUrl] = useState<string>();
  const [expires, setExpires] = useState<string>('7');

  const shortenUrl = () => {
    if (!url_input.current) {
      return;
    }

    const parse = URL.parse(url_input.current.value.trim());

    if (!parse) {
      toast({
        title: 'Invalid URL specified',
        description: 'Make sure input is a valid URL (and include protocol)'
      });

      return;
    }

    if (parse.protocol != 'http:' && parse.protocol != 'https:') {
      toast({
        title: 'Invalid URL specified',
        description: 'Only HTTP(s) protocols are allowed'
      });

      return;
    }

    setLoading(true);

    const params = new URLSearchParams({
      url: parse.toString(),
      expires
    });

    fetch(`${API_ENDPOINT}/tools/shorten-url?${params}`, {
      method: 'POST',
      credentials: 'include'
    })
      .then(fetchGetJson)
      .then((data) => {
        setShortenedUrl(data['data']['url']);
      })
      .catch(() => {
        toast({
          title: 'Error shortening URL',
          description: 'Please try again later'
        });
      })
      .finally(() => setLoading(false));
  };

  return (
    <Flex className='flex-col justify-center items-center min-h-screen py-32 gap-16'>
      <Text className='text-3xl text-center font-[Bipolar] h-8'>
        <TypeAnimation sequence={[100, 'URL SHORTENER']} cursor={false} />
      </Text>

      <Flex className='items-center justify-center gap-4 max-w-[80vw]'>
        <TextField.Root
          ref={url_input}
          className='w-96 max-w-[80vw]'
          placeholder='Enter url to shorten...'
          maxLength={512}
          onKeyDown={(e) => e.key === 'Enter' && shortenUrl()}
          disabled={loading}
        >
          <TextField.Slot side='right'>
            <IconButton variant='ghost' onClick={shortenUrl} loading={loading}>
              <ArrowRightIcon />
            </IconButton>
          </TextField.Slot>
        </TextField.Root>

        <Select.Root value={expires} onValueChange={setExpires}>
          <Tooltip content='Link Expires After'>
            <Select.Trigger className='w-24' />
          </Tooltip>
          <Select.Content>
            <Select.Group>
              <Select.Label>Expires After</Select.Label>
              <Select.Item value='1'>1 day</Select.Item>
              <Select.Item value='7'>1 week</Select.Item>
              <Select.Item value='30'>1 month</Select.Item>
              <Select.Item value='365'>1 year</Select.Item>
              <Select.Item value='never'>Never</Select.Item>
            </Select.Group>
          </Select.Content>
        </Select.Root>
      </Flex>

      <Flex className='gap-2 items-center justify-center'>
        <Skeleton loading={!shortenedUrl}>
          <Link href={shortenedUrl} target='_blank' rel='noopener noreferrer'>
            {/* Placeholder until skeleton disappears */}
            {shortenedUrl ?? 'GENERATED LINK HERE'}
          </Link>
        </Skeleton>
        <Separator orientation='vertical' />
        <Tooltip content='Copy Link'>
          <IconButton
            variant='outline'
            onClick={() =>
              shortenedUrl && navigator.clipboard.writeText(shortenedUrl)
            }
            disabled={!shortenedUrl}
          >
            <CopyIcon />
          </IconButton>
        </Tooltip>
      </Flex>
    </Flex>
  );
}

export default UrlShortener;
