import type { Handle } from '@sveltejs/kit';

const SESSION_COOKIE = 'session_id';
const ONE_YEAR = 60 * 60 * 24 * 365;

export const handle: Handle = async ({ event, resolve }) => {
	let sessionId = event.cookies.get(SESSION_COOKIE);

	if (!sessionId) {
		sessionId = crypto.randomUUID();
		event.cookies.set(SESSION_COOKIE, sessionId, {
			path: '/',
			maxAge: ONE_YEAR,
			httpOnly: true,
			sameSite: 'lax'
		});
	}

	event.locals.sessionId = sessionId;

	return resolve(event);
};
