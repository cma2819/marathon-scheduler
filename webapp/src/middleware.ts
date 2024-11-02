import { JwtPayload } from '@marathon-scheduler/models';
import { jwtDecode } from 'jwt-decode';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const parseToken = (token: string): JwtPayload | null => {
    try {
      const schema = z.object({
        sub: z.string(),
        exp: z.number(),
        username: z.string(),
        roles: z.array(z.string()),
      });
      const decoded = jwtDecode<JwtPayload>(token);
      return schema.parse(decoded);
    } catch (e) {
      console.error(e);
      return null;
    }
  };

export function middleware(request: NextRequest) {
    const now = Date.now();
  const cookie = request.cookies.get('marathon_scheduler_token')
  const token = cookie?.value;

  const payload = token && parseToken(token);
  const signedIn = (payload && payload.exp > now);

  if (request.nextUrl.pathname === '/login' && signedIn) {
    return NextResponse.redirect(new URL('/', request.nextUrl))
  }
  if (request.nextUrl.pathname !== '/login' && !signedIn) {
    return NextResponse.redirect(new URL('/login', request.nextUrl))
  }

  return NextResponse.next();
}


// Routes Middleware should not run on
export const config = {
    matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
  }