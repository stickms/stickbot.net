import { Code, Flex, Text } from "@radix-ui/themes";
import ApiEndpointInfo from "../components/api-endpoint-info";
import TokenHandler from "../components/token-handler";
import { API_ENDPOINT } from "../env";

function ApiReference() {
  return (
    <Flex className='items-center justify-center flex-col gap-y-24 mb-8'>
      <Flex className='mt-[20vh] flex-wrap items-center justify-center gap-y-8 text-center'>
        <Text className='text-3xl w-full'>API Reference</Text>
        <Code size='3'>{API_ENDPOINT}/</Code>
      </Flex>

      <TokenHandler />

      <ApiEndpointInfo 
        name='/bot/lookup/'
        method='GET'
        queries={[
          {
            name: 'token',
            description: 'Stickbot API token'
          },
          {
            name: 'steamids',
            description: 'SteamIDs of profiles in ID64 format, separated by commas'
          }
        ]}
      />

      <ApiEndpointInfo 
        name='/bot/sourcebans/'
        method='GET'
        queries={[
          {
            name: 'token',
            description: 'Stickbot API token'
          },
          {
            name: 'steamid',
            description: 'SteamIDs of profile in ID64 format'
          }
        ]}
      />

      <ApiEndpointInfo 
        name='/bot/addtag/'
        method='POST'
        queries={[
          {
            name: 'token',
            description: 'Stickbot API token'
          },
          {
            name: 'steamid',
            description: 'SteamID of profile in ID64 format'
          },
          {
            name: 'tag',
            description: 'Tag to add (cheater, suspicious, popular, banwatch)'
          }
        ]}
      />

      <ApiEndpointInfo 
        name='/bot/removetag/'
        method='DELETE'
        queries={[
          {
            name: 'token',
            description: 'Stickbot API token'
          },
          {
            name: 'steamid',
            description: 'SteamID of profile in ID64 format'
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
