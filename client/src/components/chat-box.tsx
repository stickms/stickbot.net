import { PaperPlaneIcon } from "@radix-ui/react-icons";
import { Text, Box, Card, IconButton, ScrollArea, TextField } from "@radix-ui/themes";
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

  // Keep message box at bottom if a new message arrives
  useEffect(() => {
    if (message_area.current) {
     message_area.current.scrollTop = message_area.current.scrollHeight;
    }
  }, [ messages ]);

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
    <Box className='relative size-[40vw] min-w-[min(600px,_85vw)] max-w-[85vw] min-h-[min(600px,_85vw)] max-h-[85vw]'>
      <Card className='absolute grid grid-cols-[auto_1fr] grid-rows-[1fr_auto] gap-2 w-full h-[70%]'>
        {/* User List */}
        <ScrollArea className='pr-3 pl-1 whitespace-pre-line row-[2/1] col-[2/1] w-40 max-w-[25vw]' scrollbars='vertical' type='always'>
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

        {/* Messages */}
        <ScrollArea ref={message_area} className='pr-3 whitespace-pre-line row-[2/1] col-[3/2]' scrollbars='vertical' type='always'>
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

        {/* Message Input */}
        <TextField.Root
          ref={chat_box}
          className='w-full h-8 row-[3/2] col-[3/1]'
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
      </Card>
    </Box>
  );
}

export default ChatBox;
