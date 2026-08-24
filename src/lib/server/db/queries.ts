import { createSupabaseServerClient } from './client';
import type { Mistake, PracticeAnswer, PracticeQuestion, Submission } from '$lib/types/db';

export async function getSubmissionForSession(
	submissionId: string,
	sessionId: string
): Promise<Submission | null> {
	const supabase = createSupabaseServerClient();
	const { data } = await supabase
		.from('submissions')
		.select('*')
		.eq('id', submissionId)
		.eq('session_id', sessionId)
		.maybeSingle();

	return data;
}

export async function getMistakesForSubmission(submissionId: string): Promise<Mistake[]> {
	const supabase = createSupabaseServerClient();
	const { data } = await supabase
		.from('mistakes')
		.select('*')
		.eq('submission_id', submissionId)
		.order('created_at', { ascending: true });

	return data ?? [];
}

export async function getPracticeQuestionsForSubmission(
	submissionId: string
): Promise<PracticeQuestion[]> {
	const supabase = createSupabaseServerClient();
	const { data } = await supabase
		.from('practice_questions')
		.select('*')
		.eq('submission_id', submissionId)
		.order('created_at', { ascending: true });

	return data ?? [];
}

export async function getPracticeAnswersForSession(
	questionIds: string[],
	sessionId: string
): Promise<PracticeAnswer[]> {
	if (questionIds.length === 0) return [];

	const supabase = createSupabaseServerClient();
	const { data } = await supabase
		.from('practice_answers')
		.select('*')
		.in('practice_question_id', questionIds)
		.eq('session_id', sessionId)
		.order('created_at', { ascending: false });

	return data ?? [];
}
