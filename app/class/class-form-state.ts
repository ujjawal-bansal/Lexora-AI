// See app/essay-form-state.ts — non-function exports cannot live in a 'use server' module.

export type ClassFormState = {
	errorMessage: string | null;
};

export const initialClassFormState: ClassFormState = { errorMessage: null };
