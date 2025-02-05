import { Alert, VStack, Text, Button } from '@chakra-ui/react';
import DiscordList from './discord-list';
import useAuth from '../hooks/use-auth';
import { useStore } from '@nanostores/react';
import { $guildid } from '../lib/store';
import { useState } from 'react';
import { toaster } from './ui/toaster';
import { ClipboardIconButton, ClipboardInput, ClipboardRoot } from './ui/clipboard';
import { InputGroup } from './ui/input-group';

function TokenHandler() {
  const { user, generateApiToken, revokeApiToken } = useAuth();
  const guildid = useStore($guildid);

  // Only saved on FIRST TIME token generation
  const [token, setToken] = useState<string>('');

  const generateToken = async () => {
    if (!guildid) {
      toaster.create({
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
      <Alert.Root w='auto' maxW='80vw'>
        <Alert.Indicator />
        <Alert.Title>Sign in with Discord to use Stickbot API</Alert.Title>
      </Alert.Root>
    );
  }

  if (token) {
    return (
      <ClipboardRoot maxW='min(300px, 80vw)' value={token}>
        <InputGroup w='full' endElement={<ClipboardIconButton me='-2' />}>
          <ClipboardInput />
        </InputGroup>
      </ClipboardRoot>
    );
  }

  if (user.token_guild) {
    return (
      <VStack>
        <Text>You already have an existing API token</Text>
        <Button onClick={revokeApiToken}>
          Revoke API Token
        </Button>
      </VStack>
    );
  }

  return (
    <VStack>
      <DiscordList placeholder='Generate token for...' />
      <Button onClick={generateToken} colorPalette='current'>Generate API Token</Button>
    </VStack>
  );
}

export default TokenHandler;
