import { Hono } from "hono";
import type { Context } from "../lib/context.js";
import { authGuard } from "../middleware/auth-guard.js";
import { HTTPException } from "hono/http-exception";
import { stream } from "hono/streaming";
import { youtubeDl } from 'youtube-dl-exec';
import ffmpegPath from "ffmpeg-static";

const tools_route = new Hono<Context>();

tools_route.get('/tools/youtube-info', authGuard, async (c) => {
  const query = c.req.query('query');

  if (!query) {
    throw new HTTPException(400, {
      message: 'Please supply a video query (link/id)'
    });
  }

  const resp = await youtubeDl(query, {
    dumpSingleJson: true,
    noCheckCertificates: true,
    noWarnings: true,
    preferFreeFormats: true,
    cookies: process.env.NODE_ENV === 'production' ? 'cookies.txt' : undefined,
    addHeader: ['referer:youtube.com', 'user-agent:googlebot']
  });

  return c.json({
    success: true,
    data: resp, // Payload type
  });
})

tools_route.get('/tools/youtube-dl', authGuard, async (c) => {
  const query = c.req.query('query');
  const format = c.req.query('format');

  if (!query) {
    throw new HTTPException(400, {
      message: 'Please supply a video query (link/id)'
    });
  }

  const exec_process = youtubeDl.exec(query, {
    output: '-',
    quiet: true,
    noCheckCertificates: true,
    noWarnings: true,
    format: `${format}+ba[ext=m4a]`,
    //format: 'bv*[ext=mp4][vcodec^=avc]+ba[ext=m4a]/b[ext=mp4] / bv*+ba/b',
    ffmpegLocation: `${ffmpegPath}`,
    mergeOutputFormat: 'mp4',
    recodeVideo: 'mp4',
    cookies: process.env.NODE_ENV === 'production' ? 'cookies.txt' : undefined,
    addHeader: ['referer:youtube.com', 'user-agent:googlebot']
  }, {
    stdio: [ 'ignore', 'pipe', 'ignore' ]
  });

  c.header('Content-Type', 'video/mp4');
  c.header('Content-Disposition', `attachment; filename="video.mp4"`);

  return stream(c, async (stream) => {
    stream.onAbort(() => { 
      throw new HTTPException(403, {
        message: 'Internal stream error'
      });
    });

    for await (const chunk of exec_process.stdout!) {
      await stream.write(chunk);
    }
  });
});

export default tools_route;
