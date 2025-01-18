import { PaperPlaneIcon } from "@radix-ui/react-icons";
import { Text, Box, Card, Flex, IconButton, ScrollArea, TextField } from "@radix-ui/themes";
import { useEffect, useRef } from "react";
import useToast from "../hooks/use-toast";
import { API_ENDPOINT } from "../env";
import { fetchGetJson } from "../lib/util";

function ChatBox({ roomid, users, messages } : { roomid: string, users: string[], messages: string[] }) {
  const { toast } = useToast();

  const message_area = useRef<HTMLDivElement>(null);
  const chat_box = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (message_area.current) {
      message_area.current.scrollTop = message_area.current.scrollHeight;
    }
  }, []);

  const sendChatMessage = () => {
    if (!chat_box.current) {
      return;
    }

    if (!chat_box.current.value.trim()) {
      return;
    }

    fetch(`${API_ENDPOINT}/sync/rooms/${roomid}/message`, {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({
        message: chat_box.current.value.trim()
      })
    })
      .then(fetchGetJson)
      .catch(() => {
        toast({
          title: 'Error sending message',
          description: 'Please try again later'
        });
      })
      .finally(() => chat_box.current!.value = '');
  }

  return (
    <Card className='flex flex-wrap w-[600px] max-w-[80vw] h-[400px] p-1'>
      {/* User List */}
      <Box className='h-[90%] basis-[33%] max-w-[150px] flex-shrink p-1 whitespace-pre-line'>
        <ScrollArea className='pr-3 pl-1' scrollbars='vertical' type='always'>
          {users.map((user) => (
            <Text key={user} className='text-sm break-all'>
              {user.substring(user.indexOf(':')+1)}{'\n'}
            </Text>
          ))}
        </ScrollArea>
      </Box>

      {/* Messages */}
      <Box className='h-[90%] basis-[67%] p-1 flex-grow'>
        <ScrollArea ref={message_area} type='always' scrollbars='vertical' className='pr-3 whitespace-pre-line'>
          {messages.map((msg, i) => (
            <Text key={i} className='text-sm break-all'>
              {msg.substring(0, msg.indexOf(':'))}
              <Text color='gray'>
                {msg.substring(msg.indexOf(':')) + '\n'}
              </Text>
            </Text>
          ))}
        </ScrollArea>
      </Box>

      {/* Message Entry Box */}
      <Flex className='h-[10%] w-[100%] p-1'>
        <TextField.Root
          ref={chat_box}
          className='size-full'
          placeholder='Enter chat message...'
          onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
        >
          <TextField.Slot side='right'>
            <IconButton
              variant='ghost'
              onClick={sendChatMessage}
            >
              <PaperPlaneIcon />
            </IconButton>
          </TextField.Slot>
        </TextField.Root>
      </Flex>
    </Card>
  );
}

export default ChatBox;
