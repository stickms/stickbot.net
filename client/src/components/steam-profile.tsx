import {
  Avatar,
  Badge,
  Box,
  Card,
  Flex,
  Link,
  Skeleton,
  Spinner,
  Text
} from '@radix-ui/themes';
import { ComponentProps, useEffect, useState } from 'react';
import { Sourceban, SteamProfileSummary } from '../lib/types';
import { API_ENDPOINT } from '../env';
import { useStore } from '@nanostores/react';
import { $guildid } from '../lib/store';
import { fetchGetJson, parseSteamID } from '../lib/util';

type SteamProfileProps = {
  steamid?: string;
  setDisabled?: (disabled: boolean) => void;
  skeleton?: boolean;
};

function SteamIdList({ summary }: { summary: SteamProfileSummary }) {
  const accountid = Number(BigInt(summary.steamid) & BigInt(0xffffffff));

  // Steam ID6, ID3, ID2
  const idlist = [
    summary.steamid,
    `[U:1:${accountid}]`,
    `STEAM_1:${accountid & 1}:${Math.floor(accountid / 2)}`
  ];

  // Include vanity URL if present
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
        {idlist.map((id) => (
          <Text key={id} size='2'>
            {id}
            {'\n'}
          </Text>
        ))}
      </Box>
    </Box>
  );
}

function AlertList({
  summary,
  tags
}: {
  summary: SteamProfileSummary;
  tags?: TagList;
}) {
  const alertlist: { color: string; text: string }[] = [];

  const plural = (num: number, label: string) => {
    return `${num} ${label}${num == 1 ? '' : 's'}`;
  };

  const banlist = [
    {
      label: `${plural(summary.NumberOfVACBans, 'VAC Ban')}`,
      valid: summary.NumberOfVACBans > 0
    },
    {
      label: `${plural(summary.NumberOfGameBans, 'Game Ban')}`,
      valid: summary.NumberOfGameBans > 0
    },
    {
      label: 'Community Ban',
      valid: summary.CommunityBanned
    },
    {
      label: 'Trade Ban',
      valid: summary.EconomyBan == 'banned'
    }
  ]
    .filter((x) => x.valid)
    .map((x) => ({
      color: 'red',
      text: x.label
    }));

  alertlist.push(...banlist);

  const profiletags = (): { name: string; value: string }[] => {
    return [
      { name: 'Cheater', value: 'cheater' },
      { name: 'Suspicious', value: 'suspicious' },
      { name: 'Content Creator', value: 'popular' },
      { name: 'Ban Watch', value: 'banwatch' }
    ];
  };

  if (!tags) {
    alertlist.push({
      color: 'gray',
      text: 'Loading tags...'
    });
  } else {
    for (const tag of profiletags()) {
      if (tags[tag.value]) {
        alertlist.push({
          color: tag.value === 'banwatch' ? 'blue' : 'yellow',
          text: tag.name
        });
      }
    }
  }

  if (!alertlist.length) {
    alertlist.push({
      color: 'green',
      text: 'None'
    });
  }

  return (
    <Box className='min-w-36 flex-grow'>
      <Box className='w-full'>
        <Text size='2' weight='bold'>
          Alerts
        </Text>
      </Box>
      <Box className='w-full whitespace-pre-line'>
        {alertlist.map((alert) => (
          <Box className='w-full' key={alert.text}>
            <Badge
              size='2'
              color={alert.color as ComponentProps<typeof Badge>['color']}
            >
              {alert.text}
            </Badge>
          </Box>
        ))}
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
        {Object.entries(quicklinks).map(([k, v]) => (
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
        ))}
      </Box>
    </Box>
  );
}

function Sourcebans({ sourcebans }: { sourcebans?: Sourceban[] | null }) {
  return (
    <Box className='min-w-36 flex-grow'>
      <Box className='w-full'>
        <Text size='2' weight='bold'>
          Sourcebans
        </Text>
      </Box>
      <Box className='w-full whitespace-pre-line'>
        {sourcebans === undefined && <Spinner size='3' />}
        {sourcebans === null && (
          <Text size='2'>❌ Error: Could not fetch sourcebans</Text>
        )}
        {sourcebans && !sourcebans.length && (
          <Badge size='2' color='green'>
            None
          </Badge>
        )}
        {!!sourcebans?.length &&
          sourcebans.map((s, index) => (
            <Link
              key={index}
              size='2'
              href={s.url}
              target='_blank'
              rel='noopener noreferrer'
            >
              {`${s.url.split('/')[2]} - ${s.reason}`}
              {'\n'}
            </Link>
          ))}
      </Box>
    </Box>
  );
}

function Placeholder() {
  const randomtext = [];

  for (let i = 0; i < Math.floor(Math.random() * 3) + 2; i++) {
    randomtext.push('A'.repeat(Math.floor(Math.random() * 5) + 8));
  }

  return (
    <Box className='min-w-36 flex-grow'>
      <Skeleton className='w-28 h-[17px] my-[6.5px]' />
      <Skeleton className='w-28 h-[17px] my-[6.5px]' />
      <Skeleton className='w-28 h-[17px] my-[6.5px]' />
      <Skeleton className='w-28 h-[17px] my-[6.5px]' />
    </Box>
  );
}

type TagList = {
  [Key: string]: {
    addedby: string;
    date: number;
  };
};

function SteamProfile({ steamid, setDisabled, skeleton }: SteamProfileProps) {
  const guildid = useStore($guildid);

  const [summary, setSummary] = useState<SteamProfileSummary>();
  const [sourcebans, setSourcebans] = useState<Sourceban[] | null>();
  const [tags, setTags] = useState<TagList>();

  const [error, setError] = useState<string>();

  useEffect(() => {
    const getPlayerData = async (): Promise<SteamProfileSummary> => {
      // Reset some things
      setTags(() => undefined);
      setError(() => undefined);

      let query = steamid!.trim();

      try {
        const url = new URL(query);

        if (url.hostname === 'steamcommunity.com') {
          if (
            url.pathname.startsWith('/profiles/') ||
            url.pathname.startsWith('/id/')
          ) {
            query = url.pathname.split('/')[2];
          }
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_) {
        /* empty */
      }

      const vanity = await fetch(`${API_ENDPOINT}/resolve/${query}`);
      const vanity_json = vanity.ok ? await vanity.json() : {};

      const steam = parseSteamID(vanity_json['data']?.['steamid'] ?? query);

      const summary = await fetch(`${API_ENDPOINT}/lookup/${steam}`);
      if (!summary.ok) {
        throw new Error('Could not get player summary');
      }

      fetch(`${API_ENDPOINT}/sourcebans/${steam}`)
        .then(fetchGetJson)
        .then((data) => {
          setSourcebans(data['data']);
        })
        .catch(() => setSourcebans(null));

      if (guildid) {
        fetch(`${API_ENDPOINT}/botdata/${steam}?guildid=${guildid}`, {
          credentials: 'include'
        })
          .then(fetchGetJson)
          .then((data) => {
            setTags(data['data']['tags'] ?? {});
          })
          .catch(() => setTags({}));
      } else {
        setTags({});
      }

      const summary_json = await summary.json();
      return summary_json['data'];
    };

    if (skeleton) {
      return;
    }

    getPlayerData()
      .then((summ) => setSummary(summ))
      .catch((error) => setError(error))
      .finally(() => setDisabled!(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steamid, guildid]);

  return (
    <Card className='my-2 min-h-[300px] w-[680px] max-w-[80vw]'>
      {error && (
        <Box className='whitespace-pre-line'>
          <Text size='3' weight='bold' color='ruby'>
            ❌ Error{'\n'}
          </Text>
          <Text size='3'>{error.toString()}</Text>
        </Box>
      )}

      {!error && !summary && (
        <Flex className='gap-3 items-start'>
          <Skeleton className='size-20 flex-shrink-0' />
          <Box>
            <Box className='w-full'>
              <Skeleton className='w-40 h-[19px] mb-1' />
            </Box>
            <Flex className='gap-5 flex-wrap'>
              <Placeholder />
              <Placeholder />
              <Placeholder />
              <Placeholder />
            </Flex>
          </Box>
        </Flex>
      )}

      {!error && summary && (
        <Flex className='gap-3 items-start'>
          <Avatar src={summary.avatarfull} fallback='T' size='6' />
          <Box>
            <Box className='w-full'>
              <Link
                href={`https://steamcommunity.com/profiles/${summary.steamid}`}
                target='_blank'
                rel='noopener noreferrer'
                color='gray'
                highContrast
                underline='hover'
                size='3'
                weight='bold'
              >
                {summary.personaname}
              </Link>
            </Box>
            <Flex className='gap-5 flex-wrap'>
              <SteamIdList summary={summary} />
              <AlertList summary={summary} tags={tags} />
              <QuickLinks summary={summary} />
              <Sourcebans sourcebans={sourcebans} />
            </Flex>
          </Box>
        </Flex>
      )}
    </Card>
  );
}

export default SteamProfile;
