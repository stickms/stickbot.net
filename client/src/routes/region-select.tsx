import {
  Button,
  CheckboxGroup,
  Dialog,
  Flex,
  IconButton,
  ScrollArea,
  Select,
  Text,
  TextField,
  Tooltip
} from '@radix-ui/themes';
import { useEffect, useState } from 'react';
import { TypeAnimation } from 'react-type-animation';
import { fetchGetJson } from '../lib/util';
import { API_ENDPOINT } from '../env';
import { CopyIcon } from '@radix-ui/react-icons';

// Only includes things we need
type SDRConfigResult = {
  revision: number;
  pops: Record<
    string,
    {
      desc: string;
      geo: [number, number];
      partners: number;
      tier: number;
      // We exclude non-null relays
      relays: {
        ipv4: string;
        port_range: [number, number];
      }[];
    }
  >;
};

function BlockerModal({ iplist }: { iplist: string[] }) {
  const code =
    'netsh advfirewall ' +
    'firewall delete rule name="stickbot-region-select" ; ' +
    'netsh advfirewall firewall add rule name="stickbot-region-select" ' +
    `dir=out action=block remoteip=${iplist.join()}`;

  return (
    <Dialog.Root>
      <Dialog.Trigger>
        <Button>Block Selected</Button>
      </Dialog.Trigger>
      <Dialog.Content>
        <Dialog.Title>Block Selected Regions</Dialog.Title>
        <Dialog.Description size='2' className='mb-4'>
          Copy & Paste this code into an Administrator Powershell Window:
        </Dialog.Description>
        <TextField.Root disabled value={code} size='2'>
          <TextField.Slot side='right'>
            <Tooltip content='click to copy'>
              <IconButton
                variant='ghost'
                onClick={() => navigator.clipboard.writeText(code)}
              >
                <CopyIcon />
              </IconButton>
            </Tooltip>
          </TextField.Slot>
        </TextField.Root>
      </Dialog.Content>
    </Dialog.Root>
  );
}

function UnblockerModal() {
  const code =
    'netsh advfirewall firewall delete rule name="stickbot-region-select"';

  return (
    <Dialog.Root>
      <Dialog.Trigger>
        <Button>Unblock All</Button>
      </Dialog.Trigger>
      <Dialog.Content>
        <Dialog.Title>Unblock All Regions</Dialog.Title>
        <Dialog.Description size='2' className='mb-4'>
          Copy & Paste this code into an Administrator Powershell Window:
        </Dialog.Description>
        <TextField.Root disabled value={code} size='2'>
          <TextField.Slot side='right'>
            <Tooltip content='click to copy'>
              <IconButton
                variant='ghost'
                onClick={() => navigator.clipboard.writeText(code)}
              >
                <CopyIcon />
              </IconButton>
            </Tooltip>
          </TextField.Slot>
        </TextField.Root>
      </Dialog.Content>
    </Dialog.Root>
  );
}

function RegionSelect() {
  const [appId, setAppId] = useState<string>('440');
  const [sdrdata, setSdrData] = useState<SDRConfigResult | null>();
  const [servers, setServers] = useState<string[]>([]);

  useEffect(() => {
    setServers([]);

    fetch(`${API_ENDPOINT}/tools/sdr-data/{appId}`)
      .then(fetchGetJson)
      .then((json) => {
        const data: SDRConfigResult = json['data'];

        const filteredServers = Object.entries(data.pops).filter(
          (server) => !!server[1].relays
        );

        data.pops = Object.fromEntries(filteredServers);

        setSdrData(data);
      })
      .catch(() => setSdrData(null));
  }, [appId]);

  const getIpList = (): string[] => {
    if (!sdrdata) {
      return [];
    }

    const iplist: string[] = [];

    for (const server of servers) {
      iplist.push(...sdrdata.pops[server].relays.map((relay) => relay.ipv4));
    }

    return iplist;
  };

  return (
    <Flex className='items-center min-h-screen flex-col gap-y-24 pt-40 pb-16'>
      <Text className='text-3xl text-center font-[Bipolar] h-8'>
        <TypeAnimation sequence={[100, 'REGION SELECTOR']} cursor={false} />
      </Text>

      <Flex className='flex-col gap-8 items-center max-w-[80vw]'>
        <Select.Root value={appId} onValueChange={setAppId}>
          <Select.Trigger className='w-72' />
          <Select.Content>
            <Select.Group>
              <Select.Label>Select a game</Select.Label>
              <Select.Item value='440'>Team Fortress 2</Select.Item>
              <Select.Item value='730'>Counter-Strike 2</Select.Item>
            </Select.Group>
          </Select.Content>
        </Select.Root>

        <Flex className='gap-4'>
          <Flex className='flex-col gap-2 items-center'>
            <ScrollArea
              className='max-h-72 pr-3 pl-1 whitespace-pre-line'
              type='always'
              scrollbars='vertical'
            >
              <CheckboxGroup.Root value={servers} onValueChange={setServers}>
                {!!sdrdata &&
                  Object.entries(sdrdata.pops).map((pop) => (
                    <CheckboxGroup.Item value={pop[0]}>
                      ({pop[0]}) / {pop[1].desc}
                    </CheckboxGroup.Item>
                  ))}
              </CheckboxGroup.Root>
            </ScrollArea>
            <Flex className='gap-2 flex-wrap justify-center items-center'>
              <Button
                onClick={() => setServers(Object.keys(sdrdata?.pops ?? []))}
              >
                Select All
              </Button>
              <Button onClick={() => setServers([])}>Deselect All</Button>
              <BlockerModal iplist={getIpList()} />
              <UnblockerModal />
            </Flex>
          </Flex>
        </Flex>
      </Flex>
    </Flex>
  );
}

export default RegionSelect;
