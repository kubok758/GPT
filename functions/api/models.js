const UPSTREAM = 'https://api.experientiallabs.ai/v1/models';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Cache-Control': 'no-store'
  };
}

export async function onRequest(context) {
  const { request } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (request.method !== 'GET') {
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
    const upstream = await fetch(UPSTREAM, {
      headers: { Authorization: authorization }
    });

    const headers = new Headers(corsHeaders());
    headers.set('Content-Type', upstream.headers.get('content-type') || 'application/json; charset=utf-8');

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
