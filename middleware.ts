import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, SESSION_HEADER, isValidSessionId } from '@/lib/session-shared';

const ONE_YEAR = 60 * 60 * 24 * 365;

/**
 * Replaces SvelteKit's hooks.server.ts. Issues an anonymous session id on first visit
 * and hands it to the rest of the request via a header — a cookie set on the *response*
 * is not readable by this request's Server Components, only by the next one.
 *
 * The id is validated, not just checked for presence: it is written straight into
 * Postgres `uuid` columns, so a malformed cookie would fail every query for that visitor.
 */
export function middleware(request: NextRequest) {
	const existing = request.cookies.get(SESSION_COOKIE)?.value;
	const isUsable = existing !== undefined && isValidSessionId(existing);
	const sessionId = isUsable ? existing : crypto.randomUUID();

	const requestHeaders = new Headers(request.headers);
	requestHeaders.set(SESSION_HEADER, sessionId);

	const response = NextResponse.next({ request: { headers: requestHeaders } });

	if (!isUsable) {
		response.cookies.set(SESSION_COOKIE, sessionId, {
			path: '/',
			maxAge: ONE_YEAR,
			httpOnly: true,
			sameSite: 'lax'
		});
	}

	return response;
}

export const config = {
	matcher: ['/((?!_next/static|_next/image|icon.svg|robots.txt|asset/).*)']
};
