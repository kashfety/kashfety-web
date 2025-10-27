import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Simplified middleware - let auth provider handle authentication logic
export function middleware(request: NextRequest) {
  // Just pass through all requests - auth provider will handle route protection
  return NextResponse.next()
}

// Configure the middleware to run on specific paths
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes
     */
    "/((?!_next/static|_next/image|favicon.ico|public|api).*)",
  ],
}
