import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.FRONTEND_ORIGIN,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
].filter(Boolean).map((value) => value!.replace(/\/$/, "")) as string[];

function normalizeOrigin(origin: string | null) {
  if (!origin) return null;
  try {
    return new URL(origin).origin;
  } catch {
    return origin.replace(/\/$/, "");
  }
}

function withCorsHeaders(response: NextResponse, origin: string) {
  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type, apikey, x-client-info");
  response.headers.set("Access-Control-Max-Age", "86400");
  response.headers.set("Vary", "Origin");
  return response;
}

export function middleware(request: NextRequest) {
  const origin = normalizeOrigin(request.headers.get("origin"));

  if (!origin) {
    return NextResponse.next();
  }

  const isAllowedOrigin = allowedOrigins.includes(origin);

  if (request.method === "OPTIONS") {
    const response = new NextResponse(null, { status: 204 });
    if (isAllowedOrigin) {
      withCorsHeaders(response, origin);
    }
    return response;
  }

  const response = NextResponse.next();
  if (isAllowedOrigin) {
    withCorsHeaders(response, origin);
  }

  return response;
}

export const config = {
  matcher: ["/api/:path*"],
};
