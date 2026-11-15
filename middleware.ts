import {NextResponse, type NextRequest} from 'next/server';

// Keep the public links used by the website and earlier messages working.
const LEGACY: Record<string, string> = {
  '/customer-registration': '/customer/register',
  '/partner-registration': '/partner/register',
  '/partner-portal': '/partner',
  '/login': '/portal/login',
};

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname.replace(/\/+$/, '') || '/';
  const target = LEGACY[path];
  if (!target) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = target;
  return NextResponse.redirect(url);
}

export const config = {matcher: ['/customer-registration/:path*', '/partner-registration/:path*', '/partner-portal/:path*', '/login']};
