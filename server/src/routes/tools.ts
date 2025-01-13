import { Hono } from "hono";
import type { Context } from "../lib/context.js";
import { authGuard } from "../middleware/auth-guard.js";
import { HTTPException } from "hono/http-exception";
import { youtubeDl } from 'youtube-dl-exec';
import { FFMPEG_PATH } from "../env.js";
import ffmpegPath from "ffmpeg-static";

const tools_route = new Hono<Context>();

const ffmpeg_path = FFMPEG_PATH ?? `${ffmpegPath}`;

tools_route.get('/tools/media-info', async (c) => {
  const query = c.req.query('query');

  if (!query) {
    throw new HTTPException(400, {
      message: 'Please supply a media link'
    });
  }

  const resp = await youtubeDl(query, {
    dumpSingleJson: true,
    noCheckCertificates: true,
    noWarnings: true,
    preferFreeFormats: true
  });

  return c.json({
    success: true,
    data: resp, // Payload type
  });
})

tools_route.get('/tools/soundcloud-dl', async (c) => {
  const query = c.req.query('query');
  const format = c.req.query('format');
  const ext = c.req.query('ext');

  if (!query || !format || !ext) {
    throw new HTTPException(400, {
      message: 'Please supply a media query, format, and ext'
    });
  }

  const exec_process = youtubeDl.exec(query, {
    output: '-',
    quiet: true,
    noCheckCertificates: true,
    noWarnings: true,
    format: format,
    ffmpegLocation: ffmpeg_path,
    externalDownloader: 'ffmpeg',
    externalDownloaderArgs: `-vn -f ${ext}`,
  }, {
    stdio: [ 'ignore', 'pipe', 'ignore' ]
  });

  exec_process.on('error', (error) =>{
    console.log(error);
  });

  exec_process.catch((error) => {
    console.log(error);
  });

  if (ext === 'mp3') {
    c.header('Content-Type', 'audio/mpeg');
  } else if (ext === 'opus') {
    c.header('Content-Type', 'audio/opus');
  }

  c.header('Content-Security-Policy', 'upgrade-insecure-requests');
  c.header('Content-Disposition', `attachment; filename="audio.${ext}"`);

  return c.body(exec_process.stdout! as any as ReadableStream);
});

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
    ffmpegLocation: ffmpeg_path,
    //mergeOutputFormat: 'mp4',
    remuxVideo: 'mp4',
    externalDownloader: 'ffmpeg',
    externalDownloaderArgs: '-f mp4 -movflags frag_keyframe+empty_moov -c:v libx264 -preset ultrafast -crf 23',
    //postprocessorArgs: 'FFmpeg:-f mp4 -movflags frag_keyframe+empty_moov -c:v libx264 -preset ultrafast -crf 22',
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
