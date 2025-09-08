import { NextResponse } from "next/server";

// No authentication middleware applied
export function middleware(req: Request) {
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/profile'],
};