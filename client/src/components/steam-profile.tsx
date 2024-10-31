import { Avatar, Box, Card, Flex, Spinner, Text } from '@radix-ui/themes';
import { useEffect, useState } from 'react';
import { SteamProfileSummary } from '../types/steam';

type SteamProfileProps = {
  steamid: string;
  setDisabled: (disabled: boolean) => void;
};

type ProfileSectionProps = {
  title: string,
  body: string
};

function ProfileSection({ title, body }: ProfileSectionProps) {
  return (
    <Box className='min-w-36 flex-grow'>
      <Box className='w-full'>
        <Text size='2' weight='bold'>{title}</Text>
      </Box>
      <Box className='w-full whitespace-pre-line'>
        <Text size='2'>{body}</Text>
      </Box>
    </Box>
  );
}

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

function SteamProfile({ steamid, setDisabled }: SteamProfileProps) {
  const [ summary, setSummary ] = useState<SteamProfileSummary>();

  const [ isError, setIsError ] = useState<boolean>(false);

  const [ quickLinks, setQuickLinks ] = useState<string>('');
  const [ sourcebans, setSourcebans ] = useState<string>('');

  useEffect(() => {
    fetch(`http://localhost:3000/api/lookup/${steamid}`, { signal: AbortSignal.timeout(500) })
      .then((resp) => {
        resp.json().then((json) => {
          if (json['error']) {
            setIsError(true);
          } else {
            setSummary(json as SteamProfileSummary);
          }
        }).catch((error) => {
          setIsError(true);
          console.log(error);
        }).finally(() => {
          setDisabled(false);
        });
      })
      .catch((error) => {
        setIsError(true);
        setDisabled(false);
        console.log(error);
      });
  }, [ steamid, setDisabled ]);

  if (isError) {
    return (
      <Card className='mx-4 mb-4 max-w-[80vw] min-h-[300px] w-[600px]'>
        <Text>
          Error
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
              <ProfileSection title='Quick Links' body={quickLinks} />
              <ProfileSection title='Sourcebans' body={sourcebans} />
            </Flex>
          </Box>
        </Flex>
      </Card>
    );  
  }
}

export default SteamProfile;
