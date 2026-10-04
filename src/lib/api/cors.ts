import { NextResponse } from "next/server";

const FRONTEND_ORIGIN = (process.env.FRONTEND_URL ?? process.env.FRONTEND_ORIGIN ?? "http://localhost:5173").replace(/\/$/, "");

export function getAllowedCorsOrigin(originHeader?: string | null): string | null {
  if (!originHeader) return null;
  try {
    const origin = new URL(originHeader).origin;
    return origin === FRONTEND_ORIGIN ? origin : null;
  } catch {
    return originHeader.replace(/\/$/, "") === FRONTEND_ORIGIN ? originHeader.replace(/\/$/, "") : null;
  }
}

export function withCorsHeaders(response: NextResponse, origin?: string | null) {
  const allowedOrigin = getAllowedCorsOrigin(origin ?? null);

  if (!allowedOrigin) {
    return response;
  }

  response.headers.set("Access-Control-Allow-Origin", allowedOrigin);
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type, apikey, x-client-info");
  response.headers.set("Access-Control-Max-Age", "86400");
  response.headers.set("Vary", "Origin");

  return response;
}

export function corsPreflightResponse(request: Request) {
  const origin = request.headers.get("origin");
  const allowedOrigin = getAllowedCorsOrigin(origin);

  if (!allowedOrigin) {
    return new NextResponse(null, { status: 204 });
  }

  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": allowedOrigin,
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type, apikey, x-client-info",
      "Access-Control-Max-Age": "86400",
      Vary: "Origin",
    },
  });
}
