import { Code, Flex, Text } from "@radix-ui/themes";
import ApiEndpointInfo from "../components/api-endpoint-info";
import TokenHandler from "../components/token-handler";

function ApiReference() {
  return (
    <Flex className='items-center justify-center flex-col gap-y-24 mb-6'>
      <Flex className='mt-[20vh] flex-wrap items-center justify-center gap-y-8 text-center'>
        <Text className='text-3xl w-full'>API Reference</Text>
        <Code size='3'>https://api.stickbot.net/</Code>
      </Flex>

      <TokenHandler />

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

      <ApiEndpointInfo 
        name='/bot/addtag/{steamid}'
        method='POST'
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
          },
          {
            name: 'tag',
            description: 'Tag to add (cheater, suspicious, popular, banwatch)'
          }
        ]}
      />

      <ApiEndpointInfo 
        name='/bot/removetag/{steamid}'
        method='POST'
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
          },
          {
            name: 'tag',
            description: 'Tag to remove (cheater, suspicious, popular, banwatch)'
          }
        ]}
      />
    </Flex>
  );
}

export default ApiReference;
