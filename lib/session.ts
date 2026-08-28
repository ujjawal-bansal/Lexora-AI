import 'server-only';
import { cookies, headers } from 'next/headers';
import { SESSION_COOKIE, SESSION_HEADER, isValidSessionId } from './session-shared';

/**
 * Reads the session id middleware attached to this request. Falls back to the cookie
 * for any context middleware does not cover, and to a fresh id as a last resort so a
 * missing session degrades to "sees nothing" rather than throwing.
 */
export async function getSessionId(): Promise<string> {
	const fromHeader = (await headers()).get(SESSION_HEADER);
	if (fromHeader && isValidSessionId(fromHeader)) return fromHeader;

	const fromCookie = (await cookies()).get(SESSION_COOKIE)?.value;
	if (fromCookie && isValidSessionId(fromCookie)) return fromCookie;

	return crypto.randomUUID();
}
