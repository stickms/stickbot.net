import { AbsoluteCenter, VStack, Text, HStack, Input, IconButton, createListCollection, Skeleton } from "@chakra-ui/react";
import { SelectContent, SelectItem, SelectRoot, SelectTrigger, SelectValueText } from "@/components/ui/select";
import { useRef, useState } from "react";
import { API_ENDPOINT } from "../env";
import { fetchGetJson } from "../lib/util";
import { toaster } from "@/components/ui/toaster";
import { InputGroup } from "@/components/ui/input-group";
import { FaArrowRight } from "react-icons/fa";
import { ClipboardIconButton, ClipboardInput, ClipboardRoot } from "@/components/ui/clipboard";

function UrlShortener() {
  const url_input = useRef<HTMLInputElement>(null);

  const [ loading, setLoading ] = useState<boolean>(false);
  const [ shortenedUrl, setShortenedUrl ] = useState<string>();
  const [ expires, setExpires ] = useState<string>();

  function shortenUrl() {
    if (!url_input.current || loading) {
      return;
    }

    const parse = URL.parse(url_input.current.value.trim());

    if (!parse) {
      toaster.create({
        title: 'Invalid URL specified',
        description: 'Make sure input is a valid URL (and include protocol)'
      });

      return;
    }

    if (parse.protocol != 'http:' && parse.protocol != 'https:') {
      toaster.create({
        title: 'Invalid URL specified',
        description: 'Only HTTP(s) protocols are allowed'
      });

      return;
    }

    if (!expires) {
      toaster.create({
        title: 'Please specify an expiration date'
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
        toaster.create({
          title: 'Error shortening URL',
          description: 'Please try again later'
        })
      })
      .finally(() => setLoading(false));
  };

  const expoptions = createListCollection({
    items: [
      { label: '1 day', value: '1' },
      { label: '1 week', value: '7' },
      { label: '1 month', value: '30' },
      { label: '1 year', value: '365' },
      { label: 'Never', value: 'never' }      
    ]
  });

  return (
    <AbsoluteCenter axis='both'>
      <VStack mt='16' gap='24'>
        <Text fontSize='3xl'>URL Shortener</Text>

        <HStack maxW='80vw' flexWrap='wrap' justify='center'>
          <InputGroup
            endElement={(
              <IconButton
                onClick={shortenUrl}
                size='xs'
                me='-2'
                variant='ghost'
                loading={loading}
              >
                <FaArrowRight />
              </IconButton>
            )}
          >
            <Input
              ref={url_input}
              onKeyDown={(e) => e.key === 'Enter' && shortenUrl()}
              w='96'
              maxW='80vw'
            />
          </InputGroup>

          <SelectRoot
            collection={expoptions}
            onValueChange={(e) => setExpires(e.value[0])}
            w='32'
            maxW='80vw'
          >
            <SelectTrigger>
              <SelectValueText placeholder='Expires...' />
            </SelectTrigger>
            <SelectContent>
              {expoptions.items.map((exp) => (
                <SelectItem item={exp} key={exp.value}>
                  {exp.label}
                </SelectItem>
              ))}
            </SelectContent>
          </SelectRoot>
        </HStack>

        <Skeleton loading={!shortenedUrl} variant='shine'>
          <ClipboardRoot w='64' maxW='80vw' value={shortenedUrl}>
            <InputGroup
              w='full'
              endElement={(
                <ClipboardIconButton variant='ghost' me='-2' />
              )}
            >
              <ClipboardInput />
            </InputGroup>
          </ClipboardRoot>
        </Skeleton>
      </VStack>
    </AbsoluteCenter>
  );
}

export default UrlShortener;
