import { CopyIcon, InfoCircledIcon } from "@radix-ui/react-icons";
import { Button, Callout, Flex, IconButton, Text, TextField } from "@radix-ui/themes";
import DiscordList from "../components/discord-list";
import useAuth from "../hooks/use-auth";
import { useStore } from "@nanostores/react";
import { $guildid } from "../lib/store";
import { useState } from "react";
import ApiEndpointInfo from "../components/api-endpoint-info";

function BotApiToken() {
  const { user, generateApiToken, revokeApiToken } = useAuth();
  const guildid = useStore($guildid);

  // Only saved on FIRST TIME token generation
  const [token, setToken] = useState<string>('');

  const generateToken = async () => {
    const data = await generateApiToken(guildid);
    if (data) {
      setToken(() => data['token']);
    }
  }  

  if (!user?.id) {
    return (
      <Callout.Root size='2'>
        <Callout.Icon>
          <InfoCircledIcon />
        </Callout.Icon>
        <Callout.Text>Sign in to use Stickbot API</Callout.Text>
      </Callout.Root>
    );
  }

  if (token) {
    return (
      <TextField.Root disabled value={token} size='3'>
        <TextField.Slot side='right'>
          <IconButton variant='ghost' onClick={() => navigator.clipboard.writeText(token)}>
            <CopyIcon />
          </IconButton>
        </TextField.Slot>
      </TextField.Root>
    );
  }

  if (user.token_guild) {
    return (
      <Flex className='items-center justify-center flex-col gap-y-4'>
        <Text>
          You already have an existing API token.
        </Text>
        <Button onClick={revokeApiToken}>
          Revoke API Token
        </Button>
      </Flex>
    );
  }

  return (
    <Flex className='items-center justify-center gap-x-4'>
      <DiscordList placeholder='Generate token for...' />
      <Button onClick={generateToken}>
        Generate API Token
      </Button>
    </Flex>
  );
}

function ApiReference() {
  return (
    <Flex className='items-center justify-center flex-col gap-y-24 mb-6'>
      <Flex className='mt-[20vh]'>
        <Text className='text-3xl'>API Reference</Text>
      </Flex>

      <BotApiToken />

      <ApiEndpointInfo 
        name='/bot/lookup/{steamid}'
        method='GET'
        params={[
          {
            name: 'steamid',
            description: 'SteamID of profile in ID64 format'
          }
        ]}
        queries={[
          {
            name: 'token',
            description: 'Stickbot API token'
          }
        ]}
      />
    </Flex>
  );
}

export default ApiReference;
