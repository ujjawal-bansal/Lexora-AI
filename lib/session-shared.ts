// Shared between middleware (Edge runtime) and server components — deliberately free of
// `server-only` and of any Node-only import so both runtimes can load it.

export const SESSION_COOKIE = 'session_id';
export const SESSION_HEADER = 'x-lexora-session';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidSessionId(value: string): boolean {
	return UUID_REGEX.test(value);
}
