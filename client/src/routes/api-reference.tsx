import { Code, Flex, Text } from '@radix-ui/themes';
import ApiEndpointInfo from '../components/api-endpoint-info';
import TokenHandler from '../components/token-handler';
import { API_ENDPOINT } from '../env';
import { TypeAnimation } from 'react-type-animation';

function ApiReference() {
  return (
    <Flex className='items-center justify-center flex-col gap-y-20 pt-40 pb-16'>
      <Flex className='flex-col items-center justify-center gap-6 text-center'>
        <Text className='text-3xl text-center font-[Bipolar] h-8'>
          <TypeAnimation sequence={[100, 'API REFERENCE']} cursor={false} />
        </Text>
        <Code size='4'>{API_ENDPOINT}/</Code>
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
    </Flex>
  );
}

export default ApiReference;
