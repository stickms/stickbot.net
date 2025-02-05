import { useStore } from "@nanostores/react";
import { useEffect, useRef } from "react";
import { $syncsettings } from "../lib/store";
import SocketConn from "../lib/socket";
import { SyncRoomMessages } from "../lib/types";
import { toaster } from "@/components/ui/toaster";
import { Card, Grid, Text, VStack } from "@chakra-ui/react";

type ChatBoxProps = {
  socket: SocketConn;
  users: string[];
  messages: SyncRoomMessages;
  host: {
    id: string;
    username: string;
  };
};

function ChatBox({ socket, users, messages, host } : ChatBoxProps) {
  const syncsettings = useStore($syncsettings);

  const message_area = useRef<HTMLDivElement>(null);
  const chat_box = useRef<HTMLInputElement>(null);

  // Keep message box at bottom if a new message arrives
  useEffect(() => {
    if (message_area.current) {
     message_area.current.scrollTop = message_area.current.scrollHeight;
    }
  }, [ messages ]);

  function sendChatMessage() {
    if (!chat_box.current || !chat_box.current.value.trim()) {
      return;
    }

    socket.send({
      command: 'chat',
      content: chat_box.current.value.trim()
    }, undefined, () => {
      toaster.create({
        title: 'Could not send chat message',
        description: 'Please try again later'
      });
    });

    chat_box.current!.value = '';
  }

  if (syncsettings.hide_chat) {
    return null;
  }

  return (
    <Card.Root pos='relative' w='40w' h='40w' minW='min(600px, 85vw)' maxW='85vw' minH='min(600px, 85vW)' maxH='85vw'>
      <Grid templateColumns='auto 1fr' templateRows='1fr auto' gap='2' w='full' h='70%'>
        {/* User List */}
        <VStack overflowY='auto' scrollbar='visible' scrollMargin='2' gridRow='2/1' gridColumn='2/1' w='40' maxW='25vw'>
          {users.map((user) => {
            const split = user.indexOf(':');
            const userid = user.substring(0, split);
            const username = user.substring(split + 1);

            return (
              <Text
                key={user}
                color={host.id === userid ? 'yellow' : undefined}
                fontSize='small'
                overflowWrap='anywhere'
              >
                {username + '\n'}
              </Text>
            );            
          })}
        </VStack>

        {/* Messages */}

        {/* Message Box */}
      </Grid>
    </Card.Root>
  );

  // return (
  //   <Box className='relative size-[40vw] min-w-[min(600px,_85vw)] max-w-[85vw] min-h-[min(600px,_85vw)] max-h-[85vw]'>
  //     <Card className='absolute grid grid-cols-[auto_1fr] grid-rows-[1fr_auto] gap-2 w-full h-[70%]'>
  //       {/* User List */}
  //       <ScrollArea className='pr-3 pl-1 whitespace-pre-line row-[2/1] col-[2/1] w-40 max-w-[25vw]' scrollbars='vertical' type='always'>
  //         {users.map((user) => {
  //           const split = user.indexOf(':');
  //           const userid = user.substring(0, split);
  //           const username = user.substring(split + 1);

  //           return (
  //             <Text
  //               key={user}
  //               color={host.id === userid ? 'amber' : undefined}
  //               className='text-sm break-all'
  //             >
  //               {username + '\n'}
  //             </Text>
  //           );
  //         })}
  //       </ScrollArea>

  //       {/* Messages */}
  //       <ScrollArea
  //         ref={message_area}
  //         className='pr-3 whitespace-pre-line row-[2/1] col-[3/2]'
  //         scrollbars='vertical'
  //         type='always'
  //       >
  //         {messages
  //           .sort((a, b) => a.date - b.date)
  //           .map((msg, i) => {
  //             return (
  //               <Text key={i} className='break-all text-sm'>
  //                 <Text className='text-xs' color='gray'>
  //                   {new Date(msg.date).toLocaleTimeString('en-US', {
  //                     hour: 'numeric', minute: '2-digit'
  //                   })}
  //                 </Text>
  //                 <Text color={host.id === msg.author.id ? 'amber' : undefined}>
  //                   {' ' + msg.author.username}
  //                 </Text>
  //                 <Text color='gray'>
  //                   {': ' + msg.content + '\n'}
  //                 </Text>
  //               </Text>
  //             );
  //           })
  //         }
  //       </ScrollArea>

  //       {/* Message Input */}
  //       <TextField.Root
  //         ref={chat_box}
  //         className='w-full h-8 row-[3/2] col-[3/1]'
  //         placeholder='Enter chat message...'
  //         onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
  //       >
  //         <TextField.Slot side='right'>
  //           <IconButton
  //             variant='ghost'
  //             onClick={sendChatMessage}
  //           >
  //             <PaperPlaneIcon />
  //           </IconButton>
  //         </TextField.Slot>
  //       </TextField.Root>
  //     </Card>
  //   </Box>
  // );
}

export default ChatBox;
