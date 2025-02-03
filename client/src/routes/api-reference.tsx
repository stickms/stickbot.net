import { VStack, Text, Code } from '@chakra-ui/react';
import ApiEndpointInfo from '../components/api-endpoint-info';
import TokenHandler from '../components/token-handler';
import { API_ENDPOINT } from '../env';

function ApiReference() {
  return (
    <VStack gap='20' pt='40' pb='8'>
      <VStack gap='6' textAlign='center' maxW='80vw'>
        <Text fontSize='3xl'>API Reference</Text>
        <Code size='lg'>{API_ENDPOINT}/</Code>
      </VStack>

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
            description:
              'SteamIDs of profiles in ID64 format, separated by commas'
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
            description:
              'Tag to remove (cheater, suspicious, popular, banwatch)'
          }
        ]}
      />
    </VStack>
  );
}

export default ApiReference;
