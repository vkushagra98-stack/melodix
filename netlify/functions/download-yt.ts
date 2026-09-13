import { Config, Context } from "@netlify/functions";
import ytdl from "@distube/ytdl-core";

export default async (req: Request, context: Context) => {
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  const title = url.searchParams.get('title') || 'track';

  if (!id) {
    return new Response('Missing id parameter', { status: 400 });
  }

  try {
    const info = await ytdl.getInfo(id);
    const format = ytdl.chooseFormat(info.formats, { quality: "highestaudio", filter: "audioonly" });
    
    if (!format || !format.url) {
      return new Response('Unable to extract audio stream', { status: 404 });
    }

    const response = await fetch(format.url);
    if (!response.ok) {
      return new Response('Failed to fetch media from youtube CDN', { status: response.status });
    }

    const headers = new Headers(response.headers);
    headers.set('Content-Disposition', `attachment; filename="${title.replace(/["/]/g, '')}.mp3"`);
    headers.set('Access-Control-Allow-Origin', '*');
    
    if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'audio/mpeg');
    }

    return new Response(response.body, {
      status: 200,
      headers: headers
    });
  } catch (error) {
    console.error('Download Error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
};

export const config: Config = {
  path: "/api/ytmusic/download"
};
