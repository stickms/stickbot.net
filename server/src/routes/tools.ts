import { Hono } from "hono";
import type { Context } from "../lib/context.js";
import { authGuard } from "../middleware/auth-guard.js";
import { HTTPException } from "hono/http-exception";
import { youtubeDl } from 'youtube-dl-exec';
import { existsSync } from "fs";
import ffmpegPath from "ffmpeg-static";
import { resolve as resolvePath } from "path";

const tools_route = new Hono<Context>();

const cookies = existsSync('cookies.txt') ? resolvePath('cookies.txt') : undefined;

console.log(`cookies: ${cookies}`);

tools_route.get('/tools/youtube-info', async (c) => {
  const query = c.req.query('query');

  if (!query) {
    throw new HTTPException(400, {
      message: 'Please supply a video link'
    });
  }

  const resp = await youtubeDl(query, {
    dumpSingleJson: true,
    noCheckCertificates: true,
    noWarnings: true,
    preferFreeFormats: true,
    cookies: cookies,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:133.0) Gecko/20100101 Firefox/133.0'
  });

  return c.json({
    success: true,
    data: resp, // Payload type
  });
})

tools_route.get('/tools/youtube-dl', async (c) => {
  const query = c.req.query('query');
  const format = c.req.query('format');

  if (!query) {
    throw new HTTPException(400, {
      message: 'Please supply a video link'
    });
  }

  if (!format) {
    throw new HTTPException(400, {
      message: 'Please supply a video format code'
    });
  }

  const exec_process = youtubeDl.exec(query, {
    output: '-',
    quiet: true,
    noCheckCertificates: true,
    noWarnings: true,
    format: `${format}+ba[ext=m4a]/${format}+ba/${format}/b`,
    //format: 'bv*[ext=mp4][vcodec^=avc]+ba[ext=m4a]/b[ext=mp4] / bv*+ba/b',
    ffmpegLocation: `${ffmpegPath}`,
    //mergeOutputFormat: 'mp4',
    remuxVideo: 'mp4',
    externalDownloader: 'ffmpeg',
    externalDownloaderArgs: '-f mp4 -movflags frag_keyframe+empty_moov -c:v libx264 -preset ultrafast -crf 23',
    //postprocessorArgs: 'FFmpeg:-f mp4 -movflags frag_keyframe+empty_moov -c:v libx264 -preset ultrafast -crf 22',
    cookies: cookies,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:133.0) Gecko/20100101 Firefox/133.0'
  }, {
    stdio: [ 'ignore', 'pipe', 'ignore' ]
  });

  exec_process.catch((error) => {
    console.log(error);
  });

  c.header('Content-Type', 'video/mp4');
  c.header('Content-Disposition', `attachment; filename="video.mp4"`);

  return c.body(exec_process.stdout! as any as ReadableStream);
});

export default tools_route;
