import { createNodeWebSocket } from "@hono/node-ws";
import { Hono } from "hono";
import { WSContext } from "hono/ws";
import type { Context } from "../lib/context.js";
import { authGuard } from "../middleware/auth-guard.js";
import { HTTPException } from "hono/http-exception";
import { SITE_ADMIN_IDS } from "../env.js";
import { encodeBase64urlNoPadding } from "@oslojs/encoding";

const sync_route = new Hono<Context>();

export const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({
  app: sync_route as any,
});

type SyncClient = {
  // User ID
  id?: string;
  // Username
  username?: string;
  // What room are we in?
  room?: string;
  // WebSocket Context
  ws: WSContext;
};

type SyncRoom = {
  id: string;
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

let clients: SyncClient[] = [];
let rooms: SyncRoom[] = [{
  id: '0',
  name: 'Sync Room Test',
  host: SITE_ADMIN_IDS.split(',')[0],
  leaders: [],
  meta: {
    queue: [],
    queue_counter: 0,
    start_time: Date.now(),
    stop_time: 0,
    playing: false,
    messages: []
  }
}];

function handleJoinLeave(source: SyncClient | undefined, message: any) {
  if (!source?.room) {
    return;
  }

  const room = rooms.find((room) => room.id === source.room);

  if (!room) {
    return;
  }

  let users = clients
    .filter((client) => (
      !!client.id && client.room === room.id
    ))
    .map((client) => `${client.id}:${client.username}`);
  
  if (message.join) {
    users.push(message.user);
  } else {
    const index = users.findIndex((user) => user.startsWith(message.user));
    users.splice(index, 1)
  }

  users = [ ...new Set(users) ];

  clients
    .filter((client) => client.room === source.room)
    .forEach((client) => client.ws.send(JSON.stringify({
      source: source.id,
      users
    })));
}

sync_route.get('/sync/ws', upgradeWebSocket((c) => {
  return {
    onOpen(event, ws) {
      clients.push({ ws });
    },
    onMessage(event, ws) {
      const source = clients.find((client) => client.ws === ws);
      const message = JSON.parse(event.data.toString());

      if (message.id) {
        clients = clients.map((client) => {
          return client.ws !== ws ? client : {
            ...client,
            id: message.id,
            username: message.username,
            room: message.room
          };
        });
      }

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
  return c.json({
    success: true,
    data: rooms.map((room) => ({
      ...room,
      leaders: [],    // Hide some data (e.g. private rooms)    
      users: [],
      meta: {}
    }))
  });
});

sync_route.get('/sync/rooms/:roomid', authGuard, async (c) => {
  const roomid = c.req.param('roomid');
  const room = rooms.find((room) => room.id === roomid);

  if (!room) {
    throw new HTTPException(404, {
      message: 'Room not found'
    });
  }

  let users = clients
    .filter((client) => !!client.id && client.room === room.id)
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

  const room: SyncRoom = {
    id: encodeBase64urlNoPadding(bytes),
    host: user.id,
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

  rooms = [ room, ...rooms ];

  return c.json({
    success: true,
    data: {
      room,
      roomid: room.id
    }
  });
});

sync_route.delete('/sync/rooms/:roomid', authGuard, async (c) => {
  const user = c.get('user')!;
  const roomid = c.req.param('roomid');

  const room = rooms.find((room) => room.id === roomid);
  if (!room) {
    throw new HTTPException(404, {
      message: 'Room not found'
    });
  }

  if (room.host !== user.id) {
    throw new HTTPException(401, {
      message: 'Unauthorized'
    });
  }

  rooms = rooms.filter((room) => room.id !== roomid);

  return c.json({
    success: true,
    data: rooms
  });
});

sync_route.post('/sync/rooms/:roomid/join', authGuard, async (c) => {
  const roomid = c.req.param('roomid');

  const room = rooms.find((room) => room.id === roomid);
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

  rooms = rooms.map((room) => {
    return room.id !== roomid ? room : { 
      ...room, 
      meta: {
        ...room.meta,
        playing: true,
        start_time: Date.now() - (curtime * 1000),
        stop_time: undefined
      } 
    };
  });

  clients
    .filter((client) => client.room === roomid)
    .forEach((client) => client.ws.send(JSON.stringify({
      source: user.id,
      play: true,
      curtime: curtime
    })));

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

  rooms = rooms.map((room) => {
    return room.id !== roomid ? room : { 
      ...room, 
      meta: {
        ...room.meta,
        playing: false,
        stop_time: curtime
      } 
    };
  });

  clients
    .filter((client) => client.room === roomid)
    .forEach((client) => client.ws.send(JSON.stringify({
      source: user.id,
      pause: true,
      curtime: curtime
    })));

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

  const room = rooms.find((room) => room.id === roomid);
  if (!room) {
    throw new HTTPException(404, {
      message: 'Room not found'
    });
  }

  let chat = [ ...room.meta.messages, `${user.username}: ${message}`];

  rooms = rooms.map((room) => {
    return room.id !== roomid ? room : {
      ...room,
      meta: {
        ...room.meta,
        messages: chat
      }
    }
  });

  clients
    .filter((client) => client.room === roomid)
    .forEach((client) => client.ws.send(JSON.stringify({
      source: user.id,
      chat
    })));

  return c.json({
    success: true
  });
});

sync_route.post('/sync/rooms/:roomid/queue', authGuard, async (c) => {
  const user = c.get('user')!;
  const roomid = c.req.param('roomid');
  const { add, remove } = await c.req.json();

  if (!add && !remove) {
    throw new HTTPException(400, {
      message: 'Please supply a queue element'
    });
  }

  const room = rooms.find((room) => room.id === roomid);
  if (!room) {
    throw new HTTPException(404, {
      message: 'Room not found'
    });
  }

  let queue = room.meta.queue;

  if (add) {
    queue.push(`${room.meta.queue_counter}:${add}`);

    rooms = rooms.map((room) => {
      return room.id !== roomid ? room : {
        ...room,
        meta: {
          ...room.meta,
          queue_counter: room.meta.queue_counter + 1,
          queue
        }
      }
    });
  } else {
    queue = queue.filter((q) => !q.startsWith(remove));

    rooms = rooms.map((room) => {
      return room.id !== roomid ? room : {
        ...room,
        meta: {
          ...room.meta,
          queue
        }
      }
    });
  }

  clients
    .filter((client) => client.room === roomid)
    .forEach((client) => client.ws.send(JSON.stringify({
      source: user.id,
      queue
    })));
  
  return c.json({
    success: true
  });
});

export default sync_route;
