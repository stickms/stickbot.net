import { AbsoluteCenter, VStack, Text } from "@chakra-ui/react";

function ErrorPage() {
  return (
    <AbsoluteCenter axis='both'>
      <VStack>
        <Text fontSize='3xl'>Error</Text>
        <Text fontSize='lg'>Page not found</Text>
      </VStack>
    </AbsoluteCenter>
  );
}

export default ErrorPage;
