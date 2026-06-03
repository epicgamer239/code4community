import { NextResponse } from "next/server";
import { checkApiRateLimit, retryAfterSeconds } from "@/utils/rateLimit";

export function middleware(request) {
  const result = checkApiRateLimit(request, "apiDefault");
  if (!result.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again shortly." },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSeconds(result.resetAt)),
        },
      }
    );
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
