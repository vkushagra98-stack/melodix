import { Config, Context } from "@netlify/functions";

export default async (req: Request, context: Context) => {
  const url = new URL(req.url);
  const targetUrl = url.searchParams.get('url');
  const filename = url.searchParams.get('filename') || url.searchParams.get('name') || 'melodix_song.mp3';

  if (!targetUrl) {
    return new Response('Missing target URL', { status: 400 });
  }

  // Google Video CDN actively terminates raw server-side non-chunked fetches
  // Redirect directly to the stream instead of proxying to avoid connection drops
  if (targetUrl.includes('googlevideo.com')) {
    return Response.redirect(targetUrl, 302);
  }

  try {
    const response = await fetch(targetUrl);
    
    if (!response.ok) {
      return new Response('Failed to fetch media', { status: response.status });
    }

    const headers = new Headers(response.headers);
    headers.set('Content-Disposition', `attachment; filename="${filename}"`);

    return new Response(response.body, {
      status: 200,
      headers: headers
    });
  } catch (error) {
    console.error('Download Edge Proxy Error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
};

export const config: Config = {
  path: "/api/download"
};
