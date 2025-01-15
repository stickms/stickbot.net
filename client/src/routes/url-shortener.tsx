import { ArrowRightIcon, CopyIcon } from "@radix-ui/react-icons";
import { Flex, IconButton, Link, Select, Separator, Text, TextField, Tooltip } from "@radix-ui/themes";
import { useState } from "react";
import { API_ENDPOINT } from "../env";
import { fetchGetJson } from "../lib/util";
import useToast from "../hooks/use-toast";

function UrlShortener() {
  const { toast } = useToast();

  const [ url, setUrl ] = useState<string>('');
  const [ loading, setLoading ] = useState<boolean>(false);
  const [ shortenedUrl, setShortenedUrl ] = useState<string>();
  const [ expires, setExpires ] = useState<string>('7');

  const shortenUrl = () => {
    const parse = URL.parse(url);

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
      url,
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
        })
      })
      .finally(() => setLoading(false));
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.stopPropagation();
      shortenUrl();
    }
  };

  return (
    <Flex className='items-center justify-center flex-col gap-y-24'>
      <Text className='mt-[20vh] text-3xl text-center'>URL Shortener</Text>

      <Flex className='items-center justify-center gap-4 max-w-[80vw]'>
        <TextField.Root 
          className='w-96 max-w-[80vw]'
          placeholder='Enter url...'
          maxLength={256}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={handleKeyPress}
          disabled={loading}
        >
          <TextField.Slot side='right'>
            <IconButton
              variant='ghost'
              onClick={shortenUrl}
              loading={loading}
            >
              <ArrowRightIcon />
            </IconButton>
          </TextField.Slot>
        </TextField.Root>
        
        <Select.Root value={expires} onValueChange={setExpires}>
          <Tooltip content='Link Expires After'>
            <Select.Trigger />
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

      {shortenedUrl && (
        <Flex className='gap-2 items-center justify-center mb-24'>
          <Link
            href={shortenedUrl}
            target='_blank'
            rel='noopener noreferrer'
          >
            {shortenedUrl}
          </Link>
          <Separator orientation='vertical' />
          <Tooltip content='Copy Link'>
            <IconButton
              variant='outline'
              onClick={() => navigator.clipboard.writeText(shortenedUrl)}
            >
              <CopyIcon />
            </IconButton>
          </Tooltip>
        </Flex>
      )}

      {/* For padding purposes */}
      {!shortenedUrl && <Separator orientation='vertical' className='hidden mb-24' />}
    </Flex>
  );
}

export default UrlShortener;
