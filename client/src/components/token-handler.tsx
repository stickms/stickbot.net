import { CopyIcon, InfoCircledIcon } from '@radix-ui/react-icons';
import {
  Button,
  Callout,
  Flex,
  IconButton,
  Text,
  TextField,
  Tooltip
} from '@radix-ui/themes';
import DiscordList from './discord-list';
import { useAuth } from '../hooks/use-auth';
import { useStore } from '@nanostores/react';
import { $guildid } from '../lib/store';
import { useState } from 'react';
import { useToast } from '../hooks/use-toast';

function TokenHandler() {
  const { user, generateApiToken, revokeApiToken } = useAuth();
  const { toast } = useToast();
  const guildid = useStore($guildid);

  // Only saved on FIRST TIME token generation
  const [token, setToken] = useState<string>('');

  const generateToken = async () => {
    if (!guildid) {
      toast({
        title: 'Error: Could not generate API token',
        description: 'Please select a guild for token generation'
      });
      return;
    }

    const data = await generateApiToken(guildid);
    if (data) {
      setToken(() => data);
    }
  };

  if (!user.id || !user.discord_id) {
    return (
      <Callout.Root size='2'>
        <Callout.Icon>
          <InfoCircledIcon />
        </Callout.Icon>
        <Callout.Text>Sign in with Discord to use Stickbot API</Callout.Text>
      </Callout.Root>
    );
  }

  if (token) {
    return (
      <TextField.Root disabled value={token} size='3'>
        <TextField.Slot side='right'>
          <Tooltip content='click to copy token'>
            <IconButton
              variant='ghost'
              onClick={() => navigator.clipboard.writeText(token)}
            >
              <CopyIcon />
            </IconButton>
          </Tooltip>
        </TextField.Slot>
      </TextField.Root>
    );
  }

  if (user.token_guild) {
    return (
      <Flex className='items-center justify-center flex-col gap-4 max-w-[80vw]'>
        <Text>You already have an existing API token.</Text>
        <Button onClick={revokeApiToken}>Revoke API Token</Button>
      </Flex>
    );
  }

  return (
    <Flex className='items-center justify-center flex-wrap gap-4 max-w-[80vw]'>
      <DiscordList placeholder='Generate token for...' />
      <Button onClick={generateToken}>Generate API Token</Button>
    </Flex>
  );
}

export default TokenHandler;
