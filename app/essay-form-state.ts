// Kept out of actions.ts on purpose: a 'use server' module turns every export into a
// server-action reference, so a plain constant exported from there arrives on the client
// as a function rather than the object it looks like.

export type EssayFormState = {
	errorMessage: string | null;
};

export const initialEssayFormState: EssayFormState = { errorMessage: null };
