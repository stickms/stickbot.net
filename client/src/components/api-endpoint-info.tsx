import { Badge, VStack, HStack, Table, Code, Center } from '@chakra-ui/react';
import { FaCheck } from 'react-icons/fa';
import { API_ENDPOINT } from '../env';

type EndpointInfoProps = {
  name: string;
  method: 'GET' | 'POST' | 'DELETE';
  params?: {
    name: string;
    description: string;
  }[];
  queries?: {
    name: string;
    description: string;
    optional?: boolean;
  }[];
};

function ApiEndpointInfo({ ...props }: EndpointInfoProps) {
  function methodColor() {
    if (props.method === 'GET') {
      return 'green';
    } else if (props.method === 'POST') {
      return 'orange';
    } else if (props.method === 'DELETE') {
      return 'red';
    }
  };

  return (
    <VStack gap='4' maxW='80vw'>
      <HStack gap='4' alignItems='center' justify='center' flexWrap='wrap-reverse'>
        <Badge colorPalette={methodColor()} size='lg'>
          {props.method}
        </Badge>
        <Code size='lg' textWrap='wrap' textAlign='center'>
          {API_ENDPOINT + props.name}
        </Code>
      </HStack>

      {props.params && (
        <Table.Root variant='outline' borderRadius='md'>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>Property</Table.ColumnHeader>
              <Table.ColumnHeader>Description</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {props.params.map((param) => (
              <Table.Row>
                <Table.Cell>
                  <Code>{param.name}</Code>
                </Table.Cell>
                <Table.Cell>{param.description}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      )}

      {props.queries && (
        <Table.Root variant='outline' borderRadius='md'>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>Query</Table.ColumnHeader>
              <Table.ColumnHeader>Description</Table.ColumnHeader>
              <Table.ColumnHeader>Required</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {props.queries.map((query) => (
              <Table.Row>
                <Table.Cell>
                  <Code>{query.name}</Code>
                </Table.Cell>
                <Table.Cell>{query.description}</Table.Cell>
                <Table.Cell>
                  <Center>
                    {!query.optional ? <FaCheck /> : ''}
                  </Center>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      )}
    </VStack>
  );
}

export default ApiEndpointInfo;
