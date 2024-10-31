import { Avatar, Box, Card, Flex, Spinner, Text } from '@radix-ui/themes';
import { useEffect, useState } from 'react';
import { SteamProfileSummary } from '../types/steam';

type SteamProfileProps = {
  steamid: string;
  setDisabled: (disabled: boolean) => void;
};

function SteamIdList({ summary }: {summary: SteamProfileSummary}) {
  return (
    <Box className='min-w-36 flex-grow'>
      <Box className='w-full'>
        <Text size='2' weight='bold'>Steam IDs</Text>
      </Box>
      <Box className='w-full whitespace-pre-line'>
        <Text size='2'>
          {
            summary.steamid
          }
        </Text>
      </Box>
    </Box>
  );
}

function AlertList({ summary }: {summary: SteamProfileSummary}) {
  return (
    <Box className='min-w-36 flex-grow'>
      <Box className='w-full'>
        <Text size='2' weight='bold'>Alerts</Text>
      </Box>
      <Box className='w-full whitespace-pre-line'>
        <Text size='2'>
          {
            summary.steamid
          }
        </Text>
      </Box>
    </Box>
  );
}

function QuickLinks({ summary }: {summary: SteamProfileSummary}) {
  return (
    <Box className='min-w-36 flex-grow'>
      <Box className='w-full'>
        <Text size='2' weight='bold'>Quick Links</Text>
      </Box>
      <Box className='w-full whitespace-pre-line'>
        <Text size='2'>
          {
            summary.steamid
          }
        </Text>
      </Box>
    </Box>
  );
}

function Sourcebans({ summary }: {summary: SteamProfileSummary}) {
  return (
    <Box className='min-w-36 flex-grow'>
      <Box className='w-full'>
        <Text size='2' weight='bold'>Sourcebans</Text>
      </Box>
      <Box className='w-full whitespace-pre-line'>
        <Text size='2'>
          {
            summary.steamid
          }
        </Text>
      </Box>
    </Box>
  );
}

function SteamProfile({ steamid, setDisabled }: SteamProfileProps) {
  const [ summary, setSummary ] = useState<SteamProfileSummary>();
  const [ isError, setIsError ] = useState<string>();

  useEffect(() => {
    fetch(`http://localhost:3000/api/lookup/${steamid}`, { signal: AbortSignal.timeout(500) })
      .then((resp) => {
        resp.json().then((json) => {
          if (json['error']) {
            setIsError(json['error']);
          } else {
            console.log(json);
            setSummary(json as SteamProfileSummary);
          }
        }).catch((error) => {
          setIsError(error);
        }).finally(() => {
          setDisabled(false);
        });
      })
      .catch((error) => {
        setIsError(error);
        setDisabled(false);
      });
  }, [ steamid, setDisabled ]);

  if (isError) {
    return (
      <Card className='mx-4 mb-4 max-w-[80vw] min-h-[300px] w-[600px]'>
        <Box className='w-full'>
          <Text size='3' weight='bold' color='ruby'>
            Error
          </Text>
        </Box>
          <Text size='3'>
            {isError}
          </Text>
      </Card>
    );
  } else if (!summary) {
    <Card className='mx-4 mb-4 max-w-[80vw] min-h-[300px] w-[600px]'>
      <Text>
        <Spinner size='3' /> Loading profile...
      </Text>
    </Card>
  } else {
    return (
      <Card className='mx-4 mb-4 max-w-[80vw] min-h-[300px] w-[600px]'>
        <Flex className='gap-3 items-start'>
          <Avatar src='https://imgur.com/uO7rwHu.png' fallback='T' />
          <Box>
            <Box className='w-full'>
              <Text size='3' weight='bold'>
                {summary.personaname}
              </Text>
            </Box>
            <Flex className='gap-5 flex-wrap'>
              <SteamIdList summary={summary} />
              <AlertList summary={summary} />
              <QuickLinks summary={summary} />
              <Sourcebans summary={summary} />
            </Flex>
          </Box>
        </Flex>
      </Card>
    );  
  }
}

export default SteamProfile;
