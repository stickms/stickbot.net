
import { useEffect, useState } from 'react';
import { Sourceban, SteamProfileSummary } from '../lib/types';
import { API_ENDPOINT } from '../env';
import { useStore } from '@nanostores/react';
import { $guildid } from '../lib/store';
import { fetchGetJson, parseSteamID } from '../lib/util';
import { Alert, Badge, Box, Card, HStack, Link, Spinner, Text, VStack } from '@chakra-ui/react';
import { Skeleton, SkeletonText } from './ui/skeleton';
import { Avatar } from './ui/avatar';

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
    <VStack minW='36' alignItems='start' flexGrow='1'>
      <Text>Steam IDs</Text>
      {idlist.map((id) => (
        <Text key={id}>{id}</Text>
      ))}
    </VStack>
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
    <VStack minW='36' alignItems='start' flexGrow='1'>
      <Text>Alerts</Text>
      {alertlist.map((alert) => (
        <Badge size='md' colorPalette={alert.color}>
          {alert.text}
        </Badge>
      ))}
    </VStack>
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
    <VStack minW='36' alignItems='start' flexGrow='1'>
      <Text>Quick Links</Text>
      {Object.entries(quicklinks).map(([k, v]) => (
        <Link
          key={k}
          href={`${v}${summary.steamid}`}
          target='_blank'
          rel='noopener noreferrer'
        >
          {k}
        </Link>
      ))}
    </VStack>
  );
}

function Sourcebans({
  sourcebans
}: {
  sourcebans?: Sourceban[] | null;
}) {
  return (
    <VStack minW='36' alignItems='start' flexGrow='1'>
      <Text>Sourcebans</Text>
      {sourcebans === undefined && <Spinner />}
      {sourcebans === null && (
        <Alert.Root status='error'>
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Could not fetch sourcebans</Alert.Title>
          </Alert.Content>
        </Alert.Root>
      )}
      {sourcebans && !sourcebans.length && (
        <Badge size='md' colorPalette='green'>None</Badge>
      )}
      {!!sourcebans?.length && sourcebans.map((ban, i) => (
        <Link
          key={i}
          href={ban.url}
          target='_blank'
          rel='noopener noreferrer'
        >
          {`${ban.url.split('/')[2]} - ${ban.reason}`}
        </Link>
      ))}
    </VStack>
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

  if (error) {
    return (
      <Card.Root my='2' w='680px' maxW='80vw' minH='300px'>
        <Card.Body>
          <Alert.Root status='error'>
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Error</Alert.Title>
              <Alert.Description>{error.toString()}</Alert.Description>
            </Alert.Content>
          </Alert.Root>
        </Card.Body>
      </Card.Root>
    );
  }

  if (!error && !summary) {
    return (
      <Card.Root my='2' w='680px' maxW='80vw' minH='300px'>
        <Card.Body>
          <HStack gap='3' alignItems='start'>
            <Skeleton w='20' h='20' flexShrink='0' />
            <VStack>
              <SkeletonText w='36' noOfLines={1} />
              <HStack gap='5' flexWrap='wrap'>
                {[1, 2, 3, 4].map(() => (
                  <Box flexGrow='1' maxW='36'>
                    <SkeletonText w='28' noOfLines={5} />
                  </Box>
                ))}
              </HStack>
            </VStack>
          </HStack>
        </Card.Body>
      </Card.Root>
    );
  }

  return (
    <Card.Root my='2' w='680px' maxW='80vw' minH='300px'>
      <Card.Body>
        <HStack gap='3' alignItems='start'>
          <Avatar
            shape='rounded'
            w='20'
            h='20'
            src={summary!.avatarfull} 
          />
          <VStack alignItems='start'>
            <Link
              href={`https://steamcommunity.com/profiles/${summary!.steamid}`}
              target='_blank'
              rel='noopener noreferrer'
              color='fg'
              fontSize='lg'
              fontWeight='bold'
            >
              {summary!.personaname}
            </Link>
            <HStack alignItems='start' justifyContent='start' gap='5' flexWrap='wrap'>
              <SteamIdList summary={summary!} />
              <AlertList summary={summary!} tags={tags} />
              <QuickLinks summary={summary!} />
              <Sourcebans sourcebans={sourcebans} />
            </HStack>
          </VStack>
        </HStack>
      </Card.Body>
    </Card.Root>
  );
}

export default SteamProfile;
