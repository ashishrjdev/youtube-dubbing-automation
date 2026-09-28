import type { NextRequest } from "next/server";

import { backendFetch } from "@/lib/backend";

const FORWARDED_REQUEST_HEADERS = ["accept", "content-type"];
const FORWARDED_RESPONSE_HEADERS = ["cache-control", "content-disposition", "content-type", "location"];

async function handler(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  // Auth rides on a cookie here, so reject cross-site writes (CSRF). SameSite=Lax
  // already withholds the cookie from most of them; this covers the rest.
  if (request.method !== "GET" && request.method !== "HEAD") {
    const origin = request.headers.get("origin");
    if (origin && origin !== request.nextUrl.origin) {
      return Response.json({ detail: "Cross-origin request rejected" }, { status: 403 });
    }
  }

  const { path } = await params;
  const target = `/${path.map(encodeURIComponent).join("/")}${request.nextUrl.search}`;

  const headers = new Headers();
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  const body =
    request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer();

  let upstream: Response;
  try {
    upstream = await backendFetch(target, { method: request.method, headers, body });
  } catch {
    return Response.json({ detail: "Backend unavailable" }, { status: 502 });
  }

  const responseHeaders = new Headers();
  for (const name of FORWARDED_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
}

export { handler as DELETE, handler as GET, handler as PATCH, handler as POST, handler as PUT };
