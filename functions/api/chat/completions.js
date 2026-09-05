const UPSTREAM = 'https://api.experientiallabs.ai/v1/chat/completions';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Cache-Control': 'no-store'
  };
}

export async function onRequest(context) {
  const { request } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json; charset=utf-8' }
    });
  }

  const authorization = request.headers.get('Authorization');
  if (!authorization) {
    return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
      status: 401,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json; charset=utf-8' }
    });
  }

  try {
    const body = await request.arrayBuffer();
    const upstream = await fetch(UPSTREAM, {
      method: 'POST',
      headers: {
        Authorization: authorization,
        'Content-Type': request.headers.get('Content-Type') || 'application/json'
      },
      body
    });

    const headers = new Headers(corsHeaders());
    headers.set('Content-Type', upstream.headers.get('content-type') || 'text/event-stream; charset=utf-8');
    headers.set('X-Accel-Buffering', 'no');

    return new Response(upstream.body, {
      status: upstream.status,
      headers
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: `Experiential Labs request failed: ${error.message}` }), {
      status: 502,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json; charset=utf-8' }
    });
  }
}
