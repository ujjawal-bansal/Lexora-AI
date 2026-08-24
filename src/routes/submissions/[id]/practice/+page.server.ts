import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	getMistakesForSubmission,
	getPracticeAnswersForSession,
	getPracticeQuestionsForSubmission,
	getSubmissionForSession
} from '$lib/server/db/queries';
import { createSupabaseServerClient } from '$lib/server/db/client';
import { gradeMultipleChoiceAnswer, runStage3GradeAnswer } from '$lib/server/ai/stage3-grade-answer';
import { PipelineStageError } from '$lib/server/ai/client';

export const load: PageServerLoad = async ({ params, locals }) => {
	const submission = await getSubmissionForSession(params.id, locals.sessionId);
	if (!submission) {
		error(404, 'Submission not found');
	}

	const [questions, mistakeCount] = await Promise.all([
		getPracticeQuestionsForSubmission(submission.id),
		getMistakesForSubmission(submission.id).then((m) => m.length)
	]);

	const answers = await getPracticeAnswersForSession(
		questions.map((q) => q.id),
		locals.sessionId
	);

	// Most recent answer per question (answers are ordered created_at desc).
	const latestAnswerByQuestion = new Map<string, (typeof answers)[number]>();
	for (const answer of answers) {
		if (!latestAnswerByQuestion.has(answer.practice_question_id)) {
			latestAnswerByQuestion.set(answer.practice_question_id, answer);
		}
	}

	return {
		submission,
		questions,
		mistakeCount,
		answers: Object.fromEntries(latestAnswerByQuestion)
	};
};

export const actions: Actions = {
	answerMultipleChoice: async ({ request, locals }) => {
		const formData = await request.formData();
		const questionId = String(formData.get('questionId') ?? '');
		const selectedIndex = Number(formData.get('selectedIndex'));
		const correctIndex = Number(formData.get('correctIndex'));
		const answerText = String(formData.get('answerText') ?? '');

		if (!questionId || Number.isNaN(selectedIndex) || Number.isNaN(correctIndex)) {
			return fail(400, { message: 'Invalid submission.' });
		}

		const { isCorrect } = gradeMultipleChoiceAnswer(correctIndex, selectedIndex);

		const supabase = createSupabaseServerClient();
		const { error: insertError } = await supabase.from('practice_answers').insert({
			practice_question_id: questionId,
			session_id: locals.sessionId,
			answer_text: answerText,
			is_correct: isCorrect,
			feedback: null
		});

		if (insertError) {
			return fail(500, { message: 'Could not save your answer. Please try again.' });
		}

		return { questionId, isCorrect };
	},

	answerShortResponse: async ({ request, locals }) => {
		const formData = await request.formData();
		const questionId = String(formData.get('questionId') ?? '');
		const prompt = String(formData.get('prompt') ?? '');
		const modelAnswerNotes = String(formData.get('modelAnswerNotes') ?? '');
		const answerText = String(formData.get('answerText') ?? '').trim();

		if (!questionId || !answerText) {
			return fail(400, { message: 'Please write an answer before submitting.' });
		}

		let gradeResult: { isCorrect: boolean; feedback: string };
		try {
			gradeResult = await runStage3GradeAnswer({ prompt, modelAnswerNotes, answerText });
		} catch (err) {
			const message =
				err instanceof PipelineStageError
					? 'AI grading timed out. Please try submitting again.'
					: 'Something went wrong grading your answer. Please try again.';
			return fail(502, { message, questionId });
		}

		const supabase = createSupabaseServerClient();
		const { error: insertError } = await supabase.from('practice_answers').insert({
			practice_question_id: questionId,
			session_id: locals.sessionId,
			answer_text: answerText,
			is_correct: gradeResult.isCorrect,
			feedback: gradeResult.feedback
		});

		if (insertError) {
			return fail(500, { message: 'Could not save your answer. Please try again.', questionId });
		}

		return { questionId, isCorrect: gradeResult.isCorrect, feedback: gradeResult.feedback };
	}
};
