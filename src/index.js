const EXPERIENTIAL = 'https://api.experientiallabs.ai/v1';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Cache-Control': 'no-store'
  };
}

async function proxyApi(request, pathname) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  const authorization = request.headers.get('Authorization');
  if (!authorization) {
    return Response.json({ error: 'Missing Authorization header' }, { status: 401, headers: corsHeaders() });
  }

  const allowed = pathname === '/api/models' || pathname === '/api/chat/completions';
  if (!allowed) {
    return Response.json({ error: 'Not found' }, { status: 404, headers: corsHeaders() });
  }

  const upstreamPath = pathname.replace(/^\/api/, '');
  const init = {
    method: request.method,
    headers: {
      Authorization: authorization,
      'Content-Type': request.headers.get('Content-Type') || 'application/json'
    },
    redirect: 'follow'
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = request.body;
  }

  try {
    const upstream = await fetch(EXPERIENTIAL + upstreamPath, init);
    const headers = new Headers(upstream.headers);
    for (const [key, value] of Object.entries(corsHeaders())) headers.set(key, value);
    headers.set('X-Accel-Buffering', 'no');
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch (error) {
    return Response.json(
      { error: `Experiential Labs request failed: ${error.message}` },
      { status: 502, headers: corsHeaders() }
    );
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      return proxyApi(request, url.pathname);
    }

    const asset = await env.ASSETS.fetch(request);
    const type = asset.headers.get('Content-Type') || '';

    // The repository's original GitHub Pages build talks directly to Experiential Labs.
    // On Cloudflare we transparently point those requests at this same-origin Worker proxy.
    if (type.includes('text/html')) {
      const html = (await asset.text()).replaceAll('https://api.experientiallabs.ai/v1', '/api');
      const headers = new Headers(asset.headers);
      headers.set('Content-Type', 'text/html; charset=utf-8');
      headers.set('Cache-Control', 'no-cache');
      return new Response(html, { status: asset.status, headers });
    }

    return asset;
  }
};
