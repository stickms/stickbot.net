import { createNodeWebSocket } from "@hono/node-ws";
import { Hono } from "hono";
import { WSContext } from "hono/ws";
import type { Context } from "../lib/context.js";
import { authGuard } from "../middleware/auth-guard.js";
import { HTTPException } from "hono/http-exception";
import { encodeBase64urlNoPadding } from "@oslojs/encoding";
import { dispositionFilename } from "../lib/util.js";

const sync_route = new Hono<Context>();

export const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({
  app: sync_route as any,
});

type SyncClient = {
  // User ID
  id: string;
  // Username
  username: string;
  // What room are we in?
  room: string;
  // WebSocket Context
  ws: WSContext;
};

type RoomMetadata = {
  queue: {
    id: string;
    url: string;
    title: string;
  }[];
  queue_counter: number;      // Not shared, internal counter
  start_time: number;         // MS since UTC epoch
  stop_time?: number;         // If set, overrides start_time
  playing: boolean;
  messages: string[];
};

type SyncRoom = {
  name: string;
  host: string;
  host_username: string;
  leaders: string[];
  meta: RoomMetadata;
};

type SyncRoomList = {
  [id: string]: SyncRoom;
};

let clients: SyncClient[] = [];
let rooms: SyncRoomList = {};

function editRoomMeta(roomid: string, meta: Partial<RoomMetadata>) {
  const room = rooms[roomid];
  if (!room) {
    return;
  }

  rooms[roomid] = {
    ...room,
    meta: {
      ...room.meta,
      ...meta
    }
  };
}

function relayToRoom(roomid: string, data: {}) {
  if (!rooms[roomid]) {
    return;
  }

  clients.forEach((client) => {
    if (client.room !== roomid) {
      return;
    }

    client.ws.send(JSON.stringify(data));
  });
}

function handleJoin(source: SyncClient, message: any) {
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
    source: source.id,
    play: message.command === 'play' ? true : undefined,
    pause: message.command === 'pause' ? true : undefined,
    curtime: message.curtime
  });
}

async function handleQueue(source: SyncClient, message: any) {
  if (!source.room) {
    return;
  }

  const room = rooms[source.room];
  if (!room) {
    return
  }

  editRoomMeta(source.room, {
    queue_counter: room.meta.queue_counter + 1
  });

  let queue = room.meta.queue;

  if (message.add) {
    let title: string | null = null;

    const embed = await fetch(`https://noembed.com/embed?url=${message.add}`);
    if (embed.ok) {
      const json = await embed.json();
      title = json['title'] ?? null;
    }

    if (!title) {
      const resp = await fetch(message.add, {
        method: 'HEAD'
      });
  
      if (resp.ok && resp.headers.get('Content-Type')?.startsWith('video/')) {
        title = dispositionFilename(resp.headers.get('Content-Disposition'));
      }  
    }

    queue.push({
      id: room.meta.queue_counter.toString(),
      url: message.add,
      title: title ?? message.add
    });
  } else if (message.remove) {
    queue = queue.filter((q) => q.id !== message.remove);
  } else { // Reorder elements
    queue = message.order;
  }

  editRoomMeta(source.room, {
    queue
  });

  relayToRoom(source.room, {
    source: source.id,
    queue
  });
}

function handleChat(source: SyncClient, message: any) {
  if (!source.room) {
    return;
  }

  const room = rooms[source.room];
  if (!room) {
    return
  }

  const chat = [
    ...room.meta.messages,
    `${source.id}:${source.username}: ${message.content}`
  ];

  editRoomMeta(source.room, {
    messages: chat
  });

  relayToRoom(source.room, {
    source: source.id,
    chat
  });
}

sync_route.get('/sync/ws', upgradeWebSocket((c) => {
  return {
    onOpen(event, ws) {
      const { id, username, room } = c.req.query();
      clients.push({
        ws,
        id,
        username,
        room
      });
    },
    onMessage(event, ws) {
      const source = clients.find((client) => client.ws === ws);
      if (!source) {
        return;
      }

      const message = JSON.parse(event.data.toString());

      switch (message.command) {
        case 'join':
          handleJoin(source, message);
          break;

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
      }
    },
    onClose(event, ws) {
      const source = clients.find((client) => client.ws === ws);

      if (source?.room) {
        const users = clients
          .filter((client) => (
            client.room === source.room && client.id !== source.id
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
  const mapped = Object.entries(rooms)
    .map(([id, room]) => ({
      id,
      name: room.name,
      host: room.host_username
    }));

  return c.json({
    success: true,
    data: mapped
  });
});

sync_route.get('/sync/rooms/:roomid', authGuard, async (c) => {
  const roomid = c.req.param('roomid');
  const room = rooms[roomid];

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
      ...room,
      users,
      meta: {
        ...room.meta,
        curtime: room.meta.stop_time ?? Math.floor((Date.now() - room.meta.start_time) / 1000)
      }
    }
  });
});

sync_route.post('/sync/rooms/create', authGuard, async (c) => {
  const user = c.get('user')!;
  const { name } = await c.req.json();

  if (!name) {
    throw new HTTPException(400, {
      message: 'Please specify a name'
    });
  }

  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const roomid = encodeBase64urlNoPadding(bytes);

  const room: SyncRoom = {
    host: user.id.toString(),
    host_username: user.username,
    leaders: [],
    name: name,

    meta: {
      queue: [],
      queue_counter: 0,
      start_time: 0,
      stop_time: 0,
      playing: false,
      messages: [],
    }
  }

  rooms[roomid] = room;

  return c.json({
    success: true,
    data: {
      roomid
    }
  });
});

sync_route.get('/sync/rooms/:roomid/validate', authGuard, async (c) => {
  const roomid = c.req.param('roomid');

  const room = rooms[roomid];
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

  const room = rooms[roomid];
  if (!room) {
    throw new HTTPException(404, {
      message: 'Room not found'
    });
  }

  if (room.host !== user.id.toString()) {
    throw new HTTPException(401, {
      message: 'Unauthorized'
    });
  }

  delete rooms[roomid];

  const mapped = Object.entries(rooms)
    .map(([id, room]) => ({
      id,
      name: room.name,
      host: room.host
    }));

  return c.json({
    success: true,
    data: mapped
  });
});

export default sync_route;
