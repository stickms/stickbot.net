import { CheckIcon } from "@radix-ui/react-icons";
import { Badge, Flex, Table, Code } from "@radix-ui/themes";
import { API_ENDPOINT } from "../env";

type EndpointInfoProps = {
  name: string;
  method: 'GET' | 'POST';
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
  return (
    <Flex className='items-center justify-center flex-col gap-y-8 max-w-[80vw]'>
      <Flex className='items-center gap-x-6'>
        <Badge color={props.method === 'GET' ? 'green' : 'amber'} size='3'>
          {props.method}
        </Badge>
        <Code size='4'>{API_ENDPOINT}{props.name}</Code>
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
                  <Table.Cell className='flex justify-center'>
                    {!query.optional ? <CheckIcon /> : ''}
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
