import { Config, Context } from "@netlify/functions";
import ytdl from "@distube/ytdl-core";

export default async (req: Request, context: Context) => {
  const url = new URL(req.url);
  const id = url.searchParams.get('id');

  if (!id) {
    return new Response(JSON.stringify({ error: "Missing id parameter" }), { status: 400 });
  }

  try {
    const info = await ytdl.getInfo(id);
    const format = ytdl.chooseFormat(info.formats, { quality: "highestaudio", filter: "audioonly" });
    
    if (format && format.url) {
      return new Response(JSON.stringify({ url: format.url }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    } else {
      return new Response(JSON.stringify({ error: "No stream found" }), { status: 404 });
    }
  } catch (error) {
    console.error('Stream URL Error:', error);
    return new Response(JSON.stringify({ error: "Failed to extract stream" }), { status: 500 });
  }
};

export const config: Config = {
  path: "/api/ytmusic/stream-url"
};
