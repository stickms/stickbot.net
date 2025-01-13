import { Hono } from "hono";
import type { Context } from "../lib/context.js";
import { authGuard } from "../middleware/auth-guard.js";
import ytdl from '@distube/ytdl-core';
import { HTTPException } from "hono/http-exception";
import { stream } from "hono/streaming";
import { combineVideoAudioStream } from "../lib/util.js";
import { existsSync, readFileSync } from "fs";

const tools_route = new Hono<Context>();

const agent = existsSync('cookies.json') ? ytdl.createAgent(JSON.parse(readFileSync('cookies.json', 'utf-8'))) : undefined;

tools_route.get('/tools/youtube-info', authGuard, async (c) => {
  const query = c.req.query('query');

  if (!query) {
    throw new HTTPException(400, {
      message: 'Please supply a video query (link/id)'
    });
  }

  // Throws an error if video is invalid
  const video_id = ytdl.getVideoID(query);
  const video_url = `http://www.youtube.com/watch?v=${video_id}`;

  const info = await ytdl.getInfo(video_url, {
    playerClients: ['IOS'],
    agent
  });

  return c.json({
    success: true,
    data: info
  })
})

tools_route.get('/tools/youtube-dl', authGuard, async (c) => {
  const query = c.req.query('query');
  const itag = c.req.query('itag');

  if (!query) {
    throw new HTTPException(400, {
      message: 'Please supply a video query (link/id)'
    });
  }

  if (!itag) {
    throw new HTTPException(400, {
      message: 'Please supply a video itag'
    });
  }

  // Throws an error if video is invalid
  const video_id = ytdl.getVideoID(query);
  const video_url = `http://www.youtube.com/watch?v=${video_id}`;

  const video_info = await ytdl.getInfo(video_url, {
    playerClients: ['IOS'],
    agent 
  });

  const video_format = ytdl.chooseFormat(video_info.formats, {
    filter: 'video',
    quality: itag
  });

  const audio_format = ytdl.chooseFormat(video_info.formats, {
    filter: 'audio',
    quality: 'highestaudio'
  });

  if (!video_format) {
    throw new HTTPException(400, {
      message: 'Could not download video with specified quality'
    });
  }

  if (!audio_format) {
    throw new HTTPException(400, {
      message: 'Could not find associated audio format'
    });
  }

  const video_stream = ytdl(video_url, {
    format: video_format,
    playerClients: ['IOS'],
    agent
  });

  const audio_stream = ytdl(video_url, {
    format: audio_format,
    playerClients: ['IOS'],
    agent
  });

  c.header('Content-Type', video_format.mimeType!);
  c.header('Content-Disposition', `attachment; filename="video.mp4"`);

  return stream(c, async (stream) => {
    stream.onAbort(() => { 
      throw new HTTPException(403, {
        message: 'Internal stream error'
      });
    });

    await combineVideoAudioStream(video_stream, audio_stream, async (chunk) => {
      await stream.write(chunk);
    });
  });
});

export default tools_route;
