import { Avatar, Box, Card, Flex, Link, Spinner, Text } from '@radix-ui/themes';
import { useEffect, useState } from 'react';
import { SteamProfileSummary } from '../types/steam';
import { API_ENDPOINT } from '../env';
import SteamID from 'steamid';

type SteamProfileProps = {
  steamid: string;
  setDisabled: (disabled: boolean) => void;
};

function SteamIdList({ summary }: { summary: SteamProfileSummary }) {
  const steam = new SteamID(summary.steamid);

  const idlist = [
    steam.getSteamID64(),
    steam.getSteam3RenderedID(),
    steam.getSteam2RenderedID(true)
  ];

  if (summary.profileurl.includes('/id/')) {
    idlist.push(summary.profileurl.split('/')[4]);
  }

  return (
    <Box className='min-w-36 flex-grow'>
      <Box className='w-full'>
        <Text size='2' weight='bold'>
          Steam IDs
        </Text>
      </Box>
      <Box className='w-full whitespace-pre-line'>
        {idlist.map((id) => {
          return (
            <Text key={id} size='2'>
              {id}
              {'\n'}
            </Text>
          );
        })}
      </Box>
    </Box>
  );
}

function AlertList({ summary }: { summary: SteamProfileSummary }) {
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
        <Text size='2' weight='bold'>
          Alerts
        </Text>
      </Box>
      <Box className='w-full whitespace-pre-line'>
        {alertlist.map((alert) => {
          return (
            <Text key={alert} size='2'>
              {alert}
              {'\n'}
            </Text>
          );
        })}
      </Box>
    </Box>
  );
}

function QuickLinks({ summary }: { summary: SteamProfileSummary }) {
  const quicklinks = {
    'SteamRep': 'https://steamrep.com/profiles/',
    'SteamID.uk': 'https://steamid.uk/profile/',
    'Backpack.tf': 'https://backpack.tf/profiles/',
    'SteamDB': 'https://steamdb.info/calculator/',
    'Open in Client': 'https://stickbot.net/openprofile/'
  };

  return (
    <Box className='min-w-36 flex-grow'>
      <Box className='w-full'>
        <Text size='2' weight='bold'>
          Quick Links
        </Text>
      </Box>
      <Box className='w-full whitespace-pre-line'>
        {Object.entries(quicklinks).map(([k, v]) => {
          return (
            <Link
              key={k}
              size='2'
              href={`${v}${summary.steamid}`}
              target='_blank'
              rel='noopener noreferrer'
            >
              {k}
              {'\n'}
            </Link>
          );
        })}
      </Box>
    </Box>
  );
}

function Sourcebans({ summary }: { summary: SteamProfileSummary }) {
  const sourcebans: { link: string, label: string}[] = summary.sourcebans ? Object.entries(summary.sourcebans).map(
    ([url, reason]) => {
      return {
        link: url,
        label: `${url} - ${reason}`
      };
    }
  ): [];

  return (
    <Box className='min-w-36 flex-grow'>
      <Box className='w-full'>
        <Text size='2' weight='bold'>
          Sourcebans
        </Text>
      </Box>
      <Box className='w-full whitespace-pre-line'>
        {
          sourcebans.length == 0 && (
            <Text size='2'>
              ✅ None
            </Text>
          )
        }
        {
          sourcebans.length > 0 && sourcebans.map((s, index) => {
            return (
              <Link key={`${s.link}_${index}`} href={s.link} size='2'>
                {s.label}
                {'\n'}
              </Link>
            );
          })
        }
      </Box>
    </Box>
  );
}

function SteamProfile({ steamid, setDisabled }: SteamProfileProps) {
  const [summary, setSummary] = useState<SteamProfileSummary>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    const getPlayerData = async () => {
      const vanity = await fetch(`${API_ENDPOINT}/resolve/${steamid}`, {
        signal: AbortSignal.timeout(1000)
      });

      const vanity_json = await vanity.json();
      if (vanity_json['error']) {
        throw new Error(vanity_json['error']);
      }

      const steam = new SteamID(vanity_json?.['steamid'] ?? steamid);

      const summary = await fetch(
        `${API_ENDPOINT}/lookup/${steam.getSteamID64()}?sourcebans=1`,
        {
          signal: AbortSignal.timeout(25000)
        }
      );

      const summary_json = await summary.json();
      if (summary_json['error']) {
        throw new Error(summary_json['error']);
      }

      setSummary(summary_json as SteamProfileSummary);
    };

    getPlayerData()
      .catch((error) => setError(error))
      .finally(() => setDisabled(false));
  }, [steamid, setDisabled]);

  return (
    <Card className='mb-2 min-h-[300px] w-[calc(100%-32px)]'>
      { error && (<>
        <Box className='w-full'>
          <Text size='3' weight='bold' color='ruby'>
            Error
          </Text>
        </Box>
      <Text size='3'>{error.toString()}</Text>
      </>)}

      { !error && !summary && (
        <Spinner size='3'>
          <Text>Loading profile...</Text>
        </Spinner>
      )}

      {
        !error && summary && (
          <Flex className='gap-3 items-start'>
            <Avatar src={summary.avatarfull} fallback='T' />
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
        )
      }
    </Card>
  )
}

export default SteamProfile;
