import { createNodeWebSocket } from "@hono/node-ws";
import { Hono } from "hono";
import type { Context } from "../lib/context.js";
import { authGuard } from "../middleware/auth-guard.js";
import { HTTPException } from "hono/http-exception";
import { encodeBase64urlNoPadding } from "@oslojs/encoding";
import { dispositionFilename } from "../lib/util.js";
import { db, rooms, type Room } from "../db/schema.js";
import { eq } from "drizzle-orm";
import type { SyncClient, RoomMetadata } from "../lib/types.js";

const sync_route = new Hono<Context>();

export const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({
  app: sync_route as any,
});

const defaultMetadata: RoomMetadata = {
  queue: [],
  queue_counter: 0,
  start_time: 0,
  stop_time: 0,
  playing: false,
  messages: []
}

type SyncRoomList = {
  [id: string]: RoomMetadata;
};

let clients: SyncClient[] = [];
let roomdata: SyncRoomList = {};

const roomlist = await db.select({id: rooms.id}).from(rooms);
for (const room of roomlist) {
  roomdata[room.id] = defaultMetadata;
}

function getRoomById(roomid: string): Room | undefined {
  return db.select().from(rooms).where(eq(rooms.id, roomid)).get();
}

function editRoomMeta(roomid: string, meta: Partial<RoomMetadata>) {
  const room = getRoomById(roomid);
  if (!room) {
    return;
  }

  roomdata[roomid] = {
    ...roomdata[roomid],
    ...meta
  };
}

function relayToRoom(roomid: string, data: {}) {
  const room = getRoomById(roomid);
  if (!room) {
    return;
  }

  clients.forEach((client) => {
    if (client.room !== roomid) {
      return;
    }

    client.ws.send(JSON.stringify(data));
  });
}

function handleJoin(source: SyncClient) {
  const users = clients
    .filter((client) => (
      client.room === source.room
    ))
    .map((client) => `${client.id}:${client.username}`);
  
  users.push(`${source.id}:${source.username}`);

  relayToRoom(source.room, {
    source: source.id,
    users: [ ...new Set(users) ]
  });
}

function handlePlayPause(source: SyncClient, message: any) {
  if (!source.room) {
    return;
  }

  editRoomMeta(source.room, {
    playing: message.command === 'play',
    start_time: Date.now() - (message.curtime * 1000),
    stop_time: message.command === 'pause' ? message.curtime : undefined
  });

  relayToRoom(source.room, {
    acknowledged: message.message_id,
    play: message.command === 'play' ? true : undefined,
    pause: message.command === 'pause' ? true : undefined,
    curtime: message.curtime
  });
}

async function handleQueue(source: SyncClient, message: any) {
  if (!source.room) {
    return;
  }

  const room = getRoomById(source.room);
  if (!room) {
    return
  }

  editRoomMeta(room.id, {
    queue_counter: roomdata[room.id].queue_counter + 1
  });

  let queue = roomdata[room.id].queue;

  if (message.add) {
    let title: string | null = null;

    const resps = await Promise.all([
      fetch(`https://noembed.com/embed?url=${encodeURI(message.add)}`),
      fetch(message.add, { method: 'HEAD' })
    ]);

    if (resps[0].ok) {
      const json = await resps[0].json();
      title = json['title'] ?? null;
    }

    if (!title && resps[1].ok) {
      const headers = resps[1].headers;
      if (headers.get('Content-Type')?.startsWith('video/')) {
        title = dispositionFilename(headers.get('Content-Disposition'));
      }  
    }

    queue.push({
      id: roomdata[room.id].queue_counter.toString(),
      url: message.add,
      title: title ?? message.add
    });
  } else if (message.remove) {
    queue = queue.filter((q) => q.id !== message.remove);
  } else if (message.order) {
    queue = message.order.map((i: number) => queue[i]);
  } else if (message.clear) {
    queue = [];
  }

  editRoomMeta(source.room, {
    queue
  });

  relayToRoom(source.room, {
    acknowledged: message.message_id,
    queue
  });
}

function handleChat(source: SyncClient, message: any) {
  if (!source.room) {
    return;
  }

  const room = getRoomById(source.room);
  if (!room) {
    return
  }

  const new_message = {
    author: {
      id: source.id,
      username: source.username
    },
    content: message.content,
    date: Date.now()
  }

  editRoomMeta(room.id, {
    messages: [...roomdata[room.id].messages, new_message]
  });

  relayToRoom(room.id, {
    acknowledged: message.message_id,
    chat: new_message
  });
}

function handleBackground(source: SyncClient, message: any) {
  if (!source.room) {
    return;
  }

  db
    .update(rooms)
    .set({
      backgroundUrl: message.background.url ?? null,
      backgroundSize: message.background.size ?? null
    })
    .where(eq(rooms.id, source.room))
    .returning()
    .get();

  relayToRoom(source.room, {
    acknowledged: message.message_id,
    background: {
      url: message.background.url,
      size: message.background.size
    }
  });
}

sync_route.get('/sync/ws', upgradeWebSocket((c) => {
  return {
    onOpen(event, ws) {
      const { id, username, room } = c.req.query();
      const new_client: SyncClient = {
        ws,
        id,
        username,
        room
      };

      clients.push(new_client);
      handleJoin(new_client);
    },
    onMessage(event, ws) {
      const source = clients.find((client) => client.ws === ws);
      if (!source) {
        return;
      }

      const message = JSON.parse(event.data.toString());

      switch (message.command) {
        case 'play':
        case 'pause':
          handlePlayPause(source, message);
          break;
        
        case 'queue':
          handleQueue(source, message);
          break;

        case 'chat':
          handleChat(source, message);
          break;

        case 'background':
          handleBackground(source, message);
          break;
      }
    },
    onClose(event, ws) {
      const source = clients.find((client) => client.ws === ws);

      if (source?.room) {
        const users = clients
          .filter((client) => (
            client.room === source.room && client.ws !== source.ws
          ))
          .map((client) => `${client.id}:${client.username}`);
    
        relayToRoom(source.room, {
          source: source.id,
          users: [ ...new Set(users) ] 
        });
      }

      clients = clients.filter((client) => client.ws !== ws);
    }
  }
}));

sync_route.get('/sync/rooms', authGuard, async (c) => {
  const roomlist = await db
    .select({
      id: rooms.id,
      name: rooms.name,
      host: {
        id: rooms.hostId,
        username: rooms.hostUsername
      }
    })
    .from(rooms)
    .where(eq(rooms.unlisted, false));

  return c.json({
    success: true,
    data: roomlist
  });
});

sync_route.get('/sync/rooms/:roomid', authGuard, async (c) => {
  const roomid = c.req.param('roomid');
  const room = getRoomById(roomid);

  if (!room) {
    throw new HTTPException(404, {
      message: 'Room not found'
    });
  }

  let users = clients
    .filter((client) => !!client.id && client.room === roomid)
    .map((client) => `${client.id}:${client.username}`);

  users = [ ...new Set(users) ];

  return c.json({
    success: true,
    data: {
      id: room.id,
      host: {
        id: room.hostId,
        username: room.hostUsername
      },
      background: {
        url: room.backgroundUrl,
        size: room.backgroundSize
      },
      users,
      meta: {
        ...roomdata[room.id],
        curtime: roomdata[room.id].stop_time ?? Math.floor((Date.now() - roomdata[room.id].start_time) / 1000)
      }
    }
  });
});

sync_route.post('/sync/rooms/create', authGuard, async (c) => {
  const user = c.get('user')!;
  const { name, unlisted } = await c.req.json();

  if (!name) {
    throw new HTTPException(400, {
      message: 'Please specify a name'
    });
  }

  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const roomid = encodeBase64urlNoPadding(bytes);

  const room = db
    .insert(rooms)
    .values({
      id: roomid,
      name: name,
      unlisted: unlisted,
      hostId: user.id,
      hostUsername: user.username
    })
    .returning()
    .get();

  if (!room) {
    throw new HTTPException(404, {
      message: 'Could not create room'
    });
  }

  roomdata[room.id] = defaultMetadata;
  
  return c.json({
    success: true,
    data: {
      roomid
    }
  });
});

sync_route.get('/sync/rooms/:roomid/validate', authGuard, async (c) => {
  const roomid = c.req.param('roomid');

  const room = getRoomById(roomid);
  if (!room) {
    throw new HTTPException(404, {
      message: 'Room not found'
    });
  }

  return c.json({
    success: true
  });
});

sync_route.delete('/sync/rooms/:roomid', authGuard, async (c) => {
  const user = c.get('user')!;
  const roomid = c.req.param('roomid');

  const room = getRoomById(roomid);
  if (!room) {
    throw new HTTPException(404, {
      message: 'Room not found'
    });
  }

  if (room.hostId !== user.id) {
    throw new HTTPException(401, {
      message: 'Unauthorized'
    });
  }

  await db
    .delete(rooms)
    .where(eq(rooms.id, roomid));
  
  const roomlist = await db
    .select({
      id: rooms.id,
      name: rooms.name,
      host: {
        id: rooms.hostId,
        username: rooms.hostUsername
      }
    })
    .from(rooms)
    .where((eq(rooms.unlisted, false)));

  return c.json({
    success: true,
    data: roomlist
  });
});

export default sync_route;
