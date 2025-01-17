import { createNodeWebSocket } from "@hono/node-ws";
import { Hono } from "hono";
import { WSContext } from "hono/ws";
import type { Context } from "../lib/context.js";
import { authGuard } from "../middleware/auth-guard.js";
import { HTTPException } from "hono/http-exception";
import { SITE_ADMIN_IDS } from "../env.js";

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
  users: string[];      // id:username

  meta: {
    queue: string[];
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
  users: [],
  meta: {
    queue: [],
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

  if (message.join) {
    if (room.users.includes(message.user)) {
      return;
    }
  
    rooms = rooms.map((room) => {
      return room.id !== source.room ? room : { 
        ...room, 
        users: [ ...room.users, message.user ]
      };
    });
  } else {
    rooms = rooms.map((room) => {
      return room.id !== source.room ? room : { 
        ...room, 
        users: room.users.filter((user) => !user.startsWith(message.user))
      };
    });
  }

  clients
    .filter((client) => client.room === source.room)
    .forEach((client) => client.ws.send(JSON.stringify({
      source: source.id,
      join: message.join,       // One of these
      leave: message.leave,     // should be undefined
      user: message.user
    })));
}

function handlePlayPause(source: SyncClient | undefined, message: any) {
  if (!source?.room) {
    return;
  }

  rooms = rooms.map((room) => {
    return room.id !== source.room ? room : { 
      ...room, 
      meta: {
        ...room.meta,
        playing: message.play,
        start_time: Date.now() - (message.curtime * 1000),
        stop_time: !message.play ? message.curtime : undefined
      } 
    };
  });

  clients
    .filter((client) => client.room === source.room)
    .forEach((client) => client.ws.send(JSON.stringify({
      source: source.id,
      play: message.play,       // One of these should
      pause: message.pause,     // should be undefined
      curtime: message.curtime
    })));
}

function handleChat(source: SyncClient | undefined, message: any) {
  if (!source?.room) {
    return;
  }

  rooms = rooms.map((room) => {
    return room.id !== source.room ? room : { 
      ...room, 
      meta: {
        ...room.meta,
        messages: [ ...room.meta.messages ]
      } 
    };
  });
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
        // Prevent duplicate clients
        clients = clients.filter((client) => client.id !== message.id);

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

      if (message.play || message.pause) {
        handlePlayPause(source, message);
      }
      
      if (message.chat) {
        handleChat(source, message);
      }
    },
    onClose(event, ws) {
      const source = clients.find((client) => client.ws === ws);

      rooms = rooms.map((room) => {
        return room.id !== source?.id ? room : {
          ...room,
          users: room.users.filter((user) => user !== source.id)
        }
      })

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

  return c.json({
    success: true,
    data: {
      ...room,
      meta: {
        ...room.meta,
        curtime: room.meta.stop_time ?? Math.floor((Date.now() - room.meta.start_time) / 1000)
      }
    }
  });
});

sync_route.post('/sync/rooms/create', authGuard, async (c) => {

});

sync_route.post('/sync/rooms/:roomid/join', authGuard, async (c) => {
  const user = c.get('user')!;
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

  const chat = `${user.username}: ${message}`;

  rooms = rooms.map((room) => {
    return room.id !== roomid ? room : {
      ...room,
      meta: {
        ...room.meta,
        messages: [...room.meta.messages, chat]
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

  if (add) {
    rooms = rooms.map((room) => {
      return room.id !== roomid ? room : {
        ...room,
        meta: {
          ...room.meta,
          queue: [ ...room.meta.queue, add ]
        }
      }
    });
  } else {
    rooms = rooms.map((room) => {
      return room.id !== roomid ? room : {
        ...room,
        meta: {
          ...room.meta,
          queue: room.meta.queue.filter((_, i) => i !== +remove)
        }
      }
    });
  }

  clients
    .filter((client) => client.room === roomid)
    .forEach((client) => client.ws.send(JSON.stringify({
      source: user.id,
      queue_add: add,
      queue_remove: remove
    })));

  return c.json({
    success: true
  });
});

export default sync_route;
