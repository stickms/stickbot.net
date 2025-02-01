import { Hono } from "hono";
import type { Context } from "../lib/context.js";
import { HTTPException } from "hono/http-exception";
import { youtubeDl } from 'youtube-dl-exec';
import { CLIENT_URL, FFMPEG_PATH } from "../env.js";
import ffmpegPath from "ffmpeg-static";
import { db, links } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { encodeBase64urlNoPadding } from "@oslojs/encoding";

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
    preferFreeFormats: true,
    skipDownload: true,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:134.0) Gecko/20100101 Firefox/134.0',
    referer: query,
    addHeader: [ 'Origin: https://stickbot.net/' ]
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
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:134.0) Gecko/20100101 Firefox/134.0',
    referer: query,
    addHeader: [ 'Origin: https://stickbot.net/' ]
  }, {
    stdio: [ 'ignore', 'pipe', 'ignore' ]
  });

  exec_process.on('error', (error) =>{
    console.log(error);
  });

  exec_process.catch((error) => {
    console.log(error);
  });

  c.header('Content-Type', 'application/octet-stream; charset=utf-8');
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
    ffmpegLocation: ffmpeg_path,
    remuxVideo: 'mp4',
    externalDownloader: 'ffmpeg',
    externalDownloaderArgs: '-f mp4 -movflags frag_keyframe+empty_moov -c:v libx264 -preset ultrafast -crf 23',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:134.0) Gecko/20100101 Firefox/134.0',
    referer: query,
    addHeader: [ 'Origin: https://stickbot.net/' ]
  }, {
    stdio: [ 'ignore', 'pipe', 'ignore' ]
  });

  exec_process.on('error', (error) =>{
    console.log(error);
  });

  exec_process.catch((error) => {
    console.log(error);
  });

  c.header('Content-Type', 'application/octet-stream; charset=utf-8');
  c.header('Content-Disposition', `attachment; filename="video.mp4"`);

  return c.body(exec_process.stdout! as any as ReadableStream);
});

tools_route.get('/tools/url/:id', async (c) => {
  const id = c.req.param('id');

  const entry = db
    .select()
    .from(links)
    .where(eq(links.id, id))
    .get();
  
  if (!entry) {
    return c.redirect(`${CLIENT_URL}/404`);
  }

  if (entry.expiresAt && new Date() > entry.expiresAt) {
    return c.redirect(`${CLIENT_URL}/404`);
  }

  return c.redirect(entry.url);
});

tools_route.post('/tools/shorten-url', async (c) => {
  const user = c.get('user');
  const url = c.req.query('url');
  const expires = c.req.query('expires');

  if (!url || !expires) {
    throw new HTTPException(400, {
      message: 'Please specify a url and link expiry'
    });
  }

  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);

  let expiration: Date | null = null;
  if (expires !== 'none') {
    expiration = new Date();
    expiration.setDate(expiration.getDate() + +expires);
  }
  
  const entry = db
    .insert(links)
    .values({
      id: encodeBase64urlNoPadding(bytes),
      url: url,
      expiresAt: expiration,
      userId: user?.id
    })
    .returning()
    .get();

  if (!entry) {
    throw new HTTPException(404, {
      message: 'Could not generate URL'
    });
  }

  return c.json({
    success: true,
    data: {
      id: entry.id,
      url: `${CLIENT_URL}/l/${entry.id}`
    }
  });
});

export default tools_route;
