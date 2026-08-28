// See app/essay-form-state.ts — non-function exports cannot live in a 'use server' module.

export type QueryEntry = { question: string; answer: string };

export type ClassQueryState = {
	history: QueryEntry[];
	error: string | null;
};

export const initialClassQueryState: ClassQueryState = { history: [], error: null };
