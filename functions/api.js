export async function onRequest(context) {
  const { request, env } = context;

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(request.url);

  // CREATE SHORT URL
  if (url.pathname === "/api/api" && request.method === "POST") {
    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const originalUrl = body.url;
    if (!originalUrl) {
      return new Response(JSON.stringify({ error: "URL required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const code = crypto.randomUUID().slice(0, 6);
    await env.LINKS.put(code, originalUrl);
    await env.SCANS.put(`count_${code}`, "0");

    return new Response(
      JSON.stringify({
        shortUrl: `${url.origin}/r/${code}`,
        code: code
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // REDIRECT
  if (url.pathname.startsWith("/r/")) {
    const code = url.pathname.split("/r/")[1];
    const original = await env.LINKS.get(code);
    if (!original) return new Response("Invalid QR Code", { status: 404 });

    const countKey = `count_${code}`;
    let current = await env.SCANS.get(countKey);
    current = current ? parseInt(current) : 0;
    await env.SCANS.put(countKey, (current + 1).toString());

    return Response.redirect(original, 302);
  }

  // STATS
  if (url.pathname.startsWith("/api/stats/")) {
    const code = url.pathname.split("/api/stats/")[1];
    const count = await env.SCANS.get(`count_${code}`);
    return new Response(JSON.stringify({ scans: count ? parseInt(count) : 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response("API Running", { headers: corsHeaders });
}
