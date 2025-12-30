import { NextRequest, NextResponse } from 'next/server';
import { fetchAuthSession } from 'aws-amplify/auth/server';
import { runWithAmplifyServerContext } from '@/lib/amplify-utils';

/**
 * Middleware to protect authenticated routes
 * - /auth/* routes: Requires authentication
 * - /admin/* routes: Requires authentication + ADMIN group membership
 */
export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin');

  // Check authentication and authorization
  const { authenticated, isAdmin } = await runWithAmplifyServerContext({
    nextServerContext: { request, response },
    operation: async (contextSpec) => {
      try {
        const session = await fetchAuthSession(contextSpec);
        const tokens = session.tokens;

        if (!tokens) {
          return { authenticated: false, isAdmin: false };
        }

        // Check for ADMIN group membership
        const groups = tokens.accessToken.payload['cognito:groups'];
        const hasAdminRole =
          Array.isArray(groups) && groups.includes('ADMIN');

        return {
          authenticated: true,
          isAdmin: hasAdminRole,
        };
      } catch (error) {
        console.log('Auth check failed:', error);
        return { authenticated: false, isAdmin: false };
      }
    },
  });

  // If not authenticated, redirect to login
  if (!authenticated) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // If accessing /admin/* routes and not an admin, redirect to /auth/home
  if (isAdminRoute && !isAdmin) {
    const redirectUrl = new URL('/auth/home', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

/**
 * Configure which routes this middleware runs on
 * - /auth/* - Authenticated users only
 * - /admin/* - ADMIN group members only
 */
export const config = {
  matcher: [
    '/auth/:path*', // Protect all routes under /auth
    '/admin/:path*', // Protect all routes under /admin (requires ADMIN group)
  ],
};
