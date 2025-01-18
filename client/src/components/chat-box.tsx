import { PaperPlaneIcon } from "@radix-ui/react-icons";
import { Text, Box, Card, Flex, IconButton, ScrollArea, TextField } from "@radix-ui/themes";
import { useEffect, useRef } from "react";
import useToast from "../hooks/use-toast";
import { API_ENDPOINT } from "../env";
import { fetchGetJson } from "../lib/util";

type ChatBoxProps = {
  roomid: string;
  users: string[];
  messages: string[];
  host: string;
};

function ChatBox({ roomid, users, messages, host } : ChatBoxProps) {
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
          {users.map((user) => {
            const split = user.indexOf(':');
            const userid = user.substring(0, split);
            const username = user.substring(split + 1);

            return (
              <Text
                key={user}
                color={host === userid ? 'amber' : undefined}
                className='text-sm break-all'
              >
                {username + '\n'}
              </Text>
            );
          })}
        </ScrollArea>
      </Box>

      {/* Messages */}
      <Box className='h-[90%] basis-[67%] p-1 flex-grow'>
        <ScrollArea ref={message_area} type='always' scrollbars='vertical' className='pr-3 whitespace-pre-line'>
          {messages.map((msg, i) => {
            const split1 = msg.indexOf(':');
            const split2 = msg.indexOf(':', split1 + 1);

            const userid = msg.substring(0, split1);
            const username = msg.substring(split1 + 1, split2);
            const content = msg.substring(split2 + 1);

            return (
              <Text
                key={i}
                className='text-sm break-all'
                color={host === userid ? 'amber' : undefined}
              >
                {username}
                <Text color='gray'>
                  {': ' + content + '\n'}
                </Text>
              </Text>
            );
          })}
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
