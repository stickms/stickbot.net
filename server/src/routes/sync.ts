import { createNodeWebSocket } from "@hono/node-ws";
import { Hono } from "hono";
import { WSContext } from "hono/ws";
import type { Context } from "../lib/context.js";
import { authGuard } from "../middleware/auth-guard.js";
import { HTTPException } from "hono/http-exception";
import { encodeBase64urlNoPadding } from "@oslojs/encoding";

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

type SyncRoom = {
  name: string;
  host: string;
  leaders: string[];

  meta: {
    queue: string[];
    queue_counter: number; // Not shared, internal counter
    start_time: number; // MS since UTC epoch
    stop_time?: number; // If set, overrides start_time
    playing: boolean;
    messages: string[];
  }  
};

type SyncRoomList = {
  [id: string]: SyncRoom;
};

let clients: SyncClient[] = [];
let rooms: SyncRoomList = {};

function relayToRoom(roomid: string, data: {}) {
  clients.forEach((client) => {
    if (client.room !== roomid) {
      return;
    }

    client.ws.send(JSON.stringify(data));
  });
}

function handleJoinLeave(source: SyncClient | undefined, message: any) {
  if (!source?.room) {
    return;
  }

  const room = rooms[source.room];

  if (!room) {
    return;
  }

  let users = clients
    .filter((client) => (
      !!client.id && client.room === source.room
    ))
    .map((client) => `${client.id}:${client.username}`);
  
  if (message.join) {
    users.push(message.user);
  } else {
    const index = users.findIndex((user) => user.startsWith(message.user));
    users.splice(index, 1)
  }

  users = [ ...new Set(users) ];

  relayToRoom(source.room, {
    source: source.id,
    users
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
      const message = JSON.parse(event.data.toString());

      if (message.join || message.leave) {
        handleJoinLeave(source, message);
      }

      // if (message.play || message.pause) {
      //   handlePlayPause(source, message);
      // }
    },
    onClose(event, ws) {
      clients = clients.filter((client) => client.ws !== ws);
    }
  }
}));

sync_route.get('/sync/rooms', authGuard, async (c) => {
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

sync_route.post('/sync/rooms/:roomid/join', authGuard, async (c) => {
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

sync_route.post('/sync/rooms/:roomid/play', authGuard, async (c) => {
  const user = c.get('user')!;
  const roomid = c.req.param('roomid');
  const { curtime } = await c.req.json();

  if (curtime === undefined) {
    throw new HTTPException(400, {
      message: 'Please specify the current video time'
    });
  }

  const room = rooms[roomid];

  rooms[roomid] = {
    ...room,
    meta: {
      ...room.meta,
      playing: true,
      start_time: Date.now() - (curtime * 1000),
      stop_time: undefined
    }
  };

  relayToRoom(roomid, {
    source: user.id,
    play: true,
    curtime: curtime
  });

  return c.json({
    success: true
  });
});

sync_route.post('/sync/rooms/:roomid/pause', authGuard, async (c) => {
  const user = c.get('user')!;
  const roomid = c.req.param('roomid');
  const { curtime } = await c.req.json();

  if (curtime === undefined) {
    throw new HTTPException(400, {
      message: 'Please specify the current video time'
    });
  }

  const room = rooms[roomid];

  rooms[roomid] = {
    ...room,
    meta: {
      ...room.meta,
      playing: false,
      stop_time: curtime
    }
  };

  relayToRoom(roomid, {
    source: user.id,
    pause: true,
    curtime: curtime
  });

  return c.json({
    success: true
  });
});

sync_route.post('/sync/rooms/:roomid/message', authGuard, async (c) => {
  const user = c.get('user')!;
  const roomid = c.req.param('roomid');
  const { message } = await c.req.json();

  if (!message) {
    throw new HTTPException(400, {
      message: 'Please supply a message'
    });
  }

  const room = rooms[roomid];
  if (!room) {
    throw new HTTPException(404, {
      message: 'Room not found'
    });
  }

  let chat = [ ...room.meta.messages, `${user.id}:${user.username}: ${message}`];

  rooms[roomid] = {
    ...room,
    meta: {
      ...room.meta,
      messages: chat
    }
  };

  relayToRoom(roomid, {
    source: user.id,
    chat
  });

  return c.json({
    success: true
  });
});

sync_route.post('/sync/rooms/:roomid/queue', authGuard, async (c) => {
  const user = c.get('user')!;
  const roomid = c.req.param('roomid');
  const { add, remove, order } = await c.req.json();

  if (!add && !remove && !order) {
    throw new HTTPException(400, {
      message: 'Please supply a queue element'
    });
  }

  const room = rooms[roomid];
  if (!room) {
    throw new HTTPException(404, {
      message: 'Room not found'
    });
  }

  let queue = room.meta.queue;

  if (add) {
    queue.push(`${room.meta.queue_counter}:${add}`);
  } else if (remove) {
    queue = queue.filter((q) => !q.startsWith(remove));
  } else { // Reorder elements
    queue = order;
  }

  rooms[roomid] = {
    ...room,
    meta: {
      ...room.meta,
      queue_counter: room.meta.queue_counter + 1,
      queue
    }
  };

  relayToRoom(roomid, {
    source: user.id,
    queue
  });

  return c.json({
    success: true
  });
});

export default sync_route;
