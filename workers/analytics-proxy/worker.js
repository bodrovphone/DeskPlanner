const UMAMI_HOST = 'https://api-gateway.umami.dev';
const SCRIPT_URL = 'https://cloud.umami.is/script.js';

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // Serve the Umami tracking script (disguised as a generic name)
    if (url.pathname === '/s.js') {
      const script = await fetch(SCRIPT_URL);
      const body = await script.text();

      // Rewrite the default API endpoint to go through this worker
      const origin = url.origin;
      const modified = body.replace(
        'https://api-gateway.umami.dev',
        origin
      );

      return new Response(modified, {
        headers: {
          'Content-Type': 'application/javascript',
          'Cache-Control': 'public, max-age=86400',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Proxy API calls to Umami
    if (url.pathname === '/api/send') {
      const response = await fetch(`${UMAMI_HOST}/api/send`, {
        method: request.method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': request.headers.get('User-Agent') || '',
        },
        body: request.body,
      });

      return new Response(response.body, {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, x-umami-cache',
        },
      });
    }

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, x-umami-cache',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    return new Response('Not found', { status: 404 });
  },
};
