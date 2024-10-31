import { Avatar, Box, Card, Flex, Text } from '@radix-ui/themes';
import { useEffect, useState } from 'react';

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

function SteamProfile({ steamid, setDisabled }: SteamProfileProps) {
  const [ isReady, setIsReady ] = useState<boolean>(false);

  const [ steamIds, setSteamIds ] = useState<string>('');
  const [ alerts, setAlerts ] = useState<string>('');
  const [ quickLinks, setQuickLinks ] = useState<string>('');
  const [ sourcebans, setSourcebans ] = useState<string>('');
  const [ isError, setIsError ] = useState<boolean>(false);

  useEffect(() => {
    fetch(`https://localhost:3000/api/lookup/${steamid}`, { signal: AbortSignal.timeout(500) })
      .then((resp) => {
        resp.json().then((json) => {
          console.log(json);
          setIsReady(true);
        }).catch(() => {
          setIsError(true);
        }).finally(() => {
          setDisabled(false);
        });
      })
      .catch(() => {
        setIsError(true);
        setDisabled(false);
      });
  }, [steamid, setDisabled]);

  if (isError) {
    return (
      <Card className='mx-4 mb-4 max-w-[80vw] min-h-[300px] w-[600px]'>
        <Text>
          Error
        </Text>
      </Card>
    );
  } else if (!isReady) {
    <Card className='mx-4 mb-4 max-w-[80vw] min-h-[300px] w-[600px]'>
      <Text>
        Loading profile...
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
                Profile Name - {steamid}
              </Text>
            </Box>
            <Flex className='gap-5 flex-wrap'>
              <ProfileSection title='Steam IDs' body={steamIds} />
              <ProfileSection title='Alerts' body={alerts} />
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
