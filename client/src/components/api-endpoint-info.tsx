import { CheckIcon } from "@radix-ui/react-icons";
import { Badge, Flex, Table, Code } from "@radix-ui/themes";
import { API_ENDPOINT } from "../env";

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
  const methodColor = () => {
    if (props.method === 'GET') {
      return 'green';
    } else if (props.method === 'POST') {
      return 'amber';
    } else if (props.method === 'DELETE') {
      return 'red';
    }
  }

  return (
    <Flex className='items-center justify-center flex-col gap-y-4 max-w-[80vw]'>
      <Flex className='items-center justify-center flex-wrap-reverse gap-4'>
        <Badge color={methodColor()} size='3'>
          {props.method}
        </Badge>
        <Code size='4' className='text-center'>{API_ENDPOINT}{props.name}</Code>
      </Flex>

      {props.params && (
        <Table.Root variant='surface'>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>Property</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Description</Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {props.params.map((param) => {
              return ( 
                <Table.Row>
                  <Table.RowHeaderCell>
                    <Code>{param.name}</Code>
                  </Table.RowHeaderCell>
                  <Table.Cell>{param.description}</Table.Cell>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table.Root>
      )}
      
      {props.queries && (
        <Table.Root variant='surface'>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>Query</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Description</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Required</Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {props.queries.map((query) => {
              return ( 
                <Table.Row>
                  <Table.RowHeaderCell>
                    <Code>{query.name}</Code>
                  </Table.RowHeaderCell>
                  <Table.Cell>{query.description}</Table.Cell>
                  <Table.Cell>
                    <Flex className='justify-center'>
                      {!query.optional ? <CheckIcon /> : ''}
                    </Flex>
                  </Table.Cell>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table.Root>
      )}
    </Flex>
  );
}

export default ApiEndpointInfo;
