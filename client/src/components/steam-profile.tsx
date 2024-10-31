import { Avatar, Box, Card, Flex, Text } from '@radix-ui/themes';
import { useEffect } from 'react';

type SteamProfileProps = {
  steamid: string;
  setDisabled: (disabled: boolean) => void;
};

function SteamProfile({ steamid, setDisabled }: SteamProfileProps) {
  useEffect(() => {
    setDisabled(false);
    console.log(steamid);
  }, [steamid, setDisabled]);

  return (
    <Card className='mx-4 mb-4 max-w-[80vw] min-h-[300px] w-[800px]'>
      <Flex className='gap-3 items-start'>
        <Avatar src='https://imgur.com/uO7rwHu.png' fallback='T' />
        <Box>
          <Box className='w-full'>
            <Text size='3' weight='bold'>
              Profile Name - {steamid}
            </Text>
          </Box>
          <Flex className='gap-3 flex-wrap'>
            <Box className='w-48 flex-grow'>
              <Text size='2'>1</Text>
            </Box>
            <Box className='w-48 flex-grow'>
              <Text size='2'>2</Text>
            </Box>
            <Box className='w-48 flex-grow'>
              <Text size='2'>3</Text>
            </Box>
            <Box className='w-48 flex-grow'>
              <Text size='2'>4</Text>
            </Box>
            <Box className='w-48 flex-grow'>
              <Text size='2'>5</Text>
            </Box>
          </Flex>
        </Box>
      </Flex>
    </Card>
  );
}

export default SteamProfile;
