import { Avatar, Box, Card, Flex, Link, Spinner, Text } from '@radix-ui/themes';
import { useEffect, useState } from 'react';
import { Sourceban, SteamProfileSummary } from '../types/steam';
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

function Sourcebans({
  sourcebans,
  error
}: {
  sourcebans: Sourceban[] | undefined;
  error: string | undefined;
}) {
  return (
    <Box className='min-w-36 flex-grow'>
      <Box className='w-full'>
        <Text size='2' weight='bold'>
          Sourcebans
        </Text>
      </Box>
      <Box className='w-full whitespace-pre-line'>
        {!sourcebans && !error && <Spinner size='3' />}
        {error && <Text size='2'>❌ Error: {error.toString()}</Text>}
        {sourcebans && sourcebans.length == 0 && <Text size='2'>✅ None</Text>}
        {sourcebans &&
          sourcebans.length > 0 &&
          sourcebans.map((s, index) => {
            return (
              <Link key={index} href={s.url} size='2'>
                {`${s.url.split('/')[2]} - ${s.reason}`}
                {'\n'}
              </Link>
            );
          })}
      </Box>
    </Box>
  );
}

async function fetchTimeout(url: string, timeout = 1000): Promise<Response> {
  return new Promise<Response>((resolve, reject) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      fetch(url, { signal: controller.signal })
        .then((response) => resolve(response))
        .catch((error) => reject(error))
        .finally(() => clearTimeout(timeoutId));
    } catch (error) {
      reject(error);
    }
  });
}

function SteamProfile({ steamid, setDisabled }: SteamProfileProps) {
  const [summary, setSummary] = useState<SteamProfileSummary>();
  const [sourcebans, setSourcebans] = useState<Sourceban[]>();

  const [error, setError] = useState<string>();
  const [sourcebansError, setSourcebansError] = useState<string>();

  useEffect(() => {
    const getPlayerData = async (): Promise<SteamProfileSummary> => {
      const vanity = await fetchTimeout(`${API_ENDPOINT}/resolve/${steamid}`);

      const vanity_json = await vanity.json();
      if (vanity_json['error']) {
        throw new Error(vanity_json['error']);
      }

      const steam = new SteamID(vanity_json?.['steamid'] ?? steamid);

      const summary = await fetchTimeout(
        `${API_ENDPOINT}/lookup/${steam.getSteamID64()}`
      );

      const summary_json = await summary.json();
      if (summary_json['error']) {
        throw new Error(summary_json['error']);
      }

      fetchTimeout(`${API_ENDPOINT}/sourcebans/${steam.getSteamID64()}`, 5_000)
        .then(async (resp) => {
          const bans_json = await resp.json();
          setSourcebans(bans_json['sourcebans']);
        })
        .catch((error) => setSourcebansError(`${error}`));

      return summary_json;
    };

    getPlayerData()
      .then((summ) => setSummary(summ))
      .catch((error) => setError(error))
      .finally(() => setDisabled(false));
  }, [steamid, setDisabled]);

  return (
    <Card className='mb-2 min-h-[300px] w-[calc(100%-32px)]'>
      {error && (
        <>
          <Box className='w-full'>
            <Text size='3' weight='bold' color='ruby'>
              ❌ Error
            </Text>
          </Box>
          <Text size='3'>{error.toString()}</Text>
        </>
      )}

      {!error && !summary && (
        <Spinner size='3'>
          <Text>Loading profile...</Text>
        </Spinner>
      )}

      {!error && summary && (
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
              <Sourcebans sourcebans={sourcebans} error={sourcebansError} />
            </Flex>
          </Box>
        </Flex>
      )}
    </Card>
  );
}

export default SteamProfile;
