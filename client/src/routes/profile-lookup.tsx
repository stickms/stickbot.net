import { Flex, Text, TextField } from '@radix-ui/themes';

function ProfileLookup() {
  return (
    <Flex className='items-center justify-center h-screen flex-col gap-y-24'>
      <Text className='text-3xl'>Steam Profile Lookup</Text>
      <Flex className='items-center justify-center flex-col gap-y-4'>
        <TextField.Root
          className='w-96'
          placeholder='Lookup a Steam Profile...'
        />
      </Flex>
    </Flex>
  );
}

export default ProfileLookup;
