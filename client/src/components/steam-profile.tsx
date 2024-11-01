import { Avatar, Box, Card, Flex, Link, Spinner, Text } from '@radix-ui/themes';
import { useEffect, useState } from 'react';
import { SteamProfileSummary } from '../types/steam';
import { API_ENDPOINT } from '../env';

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
  const alertlist: string[] = [];

  const plural = (num: number, label: string) => {
    return `${num} ${label}${num == 1 ? '' : 's'}`;
  };

  const banlist = [
    {
      label: `❌ ${plural(summary.NumberOfVACBans, 'VAC Ban')}`,
      valid: summary.NumberOfVACBans > 0
    },
    {
      label: `❌ ${plural(summary.NumberOfGameBans, 'Game Ban')}`,
      valid: summary.NumberOfGameBans > 0
    },
    {
      label: '❌ Community Ban',
      valid: summary.CommunityBanned
    },
    {
      label: '❌ Trade Ban',
      valid: summary.EconomyBan == 'banned'
    }
  ]
    .filter((x) => x.valid)
    .map((x) => x.label);

  alertlist.push(...banlist);

  if (!alertlist.length) {
    alertlist.push('✅ None');
  }

  return (
    <Box className='min-w-36 flex-grow'>
      <Box className='w-full'>
        <Text size='2' weight='bold'>Alerts</Text>
      </Box>
      <Box className='w-full whitespace-pre-line'>
        {
          alertlist.map((alert) => {
            return (
              <Text key={alert} size='2'>
                {alert}{'\n'}
              </Text>
            );
          })
        }
      </Box>
    </Box>
  );
}

function QuickLinks({ summary }: {summary: SteamProfileSummary}) {
  const quicklinks = {
    'SteamRep': 'https://steamrep.com/profiles/',
    'SteamID.uk': 'https://steamid.uk/profile/',
    'Backpack.tf': 'https://backpack.tf/profiles/',
    'SteamDB': 'https://steamdb.info/calculator/',
    'Open in Client': 'https://stickbot.net/openprofile/'
  }

  return (
    <Box className='min-w-36 flex-grow'>
      <Box className='w-full'>
        <Text size='2' weight='bold'>Quick Links</Text>
      </Box>
      <Box className='w-full whitespace-pre-line'>
        {
          Object.entries(quicklinks).map(([k, v]) => {
            return (
              <Link key={k} size='2' href={`${v}${summary.steamid}`}>
                {k}{'\n'}
              </Link>
            );
          })
        }
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
  const [ error, setError ] = useState<string>();

  useEffect(() => {
    fetch(`${API_ENDPOINT}/lookup/${steamid}`, {
        signal: AbortSignal.timeout(1000)
      })
      .then((resp) => {
        resp.json().then((json) => {
          if (json['error']) {
            setError(json['error']);
          } else {
            setSummary(json as SteamProfileSummary);
          }
        }).catch((error) => {
          setError(error);
        }).finally(() => {
          setDisabled(false);
        });
      })
      .catch((error) => {
        setError(error);
        setDisabled(false);
      });
  }, [ steamid, setDisabled ]);

  if (error) {
    return (
      <Card className='mx-4 mb-4 max-w-[80vw] min-h-[300px] w-[600px]'>
        <Box className='w-full'>
          <Text size='3' weight='bold' color='ruby'>
            Error
          </Text>
        </Box>
        <Text size='3'>
          {error.toString()}
        </Text>
      </Card>
    );
  } else if (!summary) {
    <Card className='mx-4 mb-4 max-w-[80vw] min-h-[300px] w-[600px]'>
      <Spinner size='3'>
        <Text>
            Loading profile...
        </Text>
      </Spinner>
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
