'use server';

import { PipelineStageError } from '@/lib/server/ai/client';
import {
	gradeMultipleChoiceAnswer,
	runStage3GradeAnswer
} from '@/lib/server/ai/stage3-grade-answer';
import { createSupabaseServerClient } from '@/lib/server/db/client';
import { getPracticeQuestionById } from '@/lib/server/db/queries';
import { getSessionId } from '@/lib/session';
import type { AnswerState } from './answer-state';

async function persistAnswer(args: {
	questionId: string;
	answerText: string;
	isCorrect: boolean;
	feedback: string | null;
}): Promise<boolean> {
	const sessionId = await getSessionId();
	const supabase = createSupabaseServerClient();

	const { error } = await supabase.from('practice_answers').insert({
		practice_question_id: args.questionId,
		session_id: sessionId,
		answer_text: args.answerText,
		is_correct: args.isCorrect,
		feedback: args.feedback
	});

	return !error;
}

/**
 * Grades against `correct_choice_index` read from the database, not a value posted by the
 * client. The SvelteKit version passed the correct index through a hidden input, which made
 * correctness a client-supplied claim.
 */
export async function answerMultipleChoiceAction(
	_previous: AnswerState,
	formData: FormData
): Promise<AnswerState> {
	const questionId = String(formData.get('questionId') ?? '');
	const selectedIndex = Number(formData.get('selectedIndex'));

	if (!questionId || Number.isNaN(selectedIndex)) {
		return { status: 'error', message: 'Invalid submission.' };
	}

	const question = await getPracticeQuestionById(questionId);
	if (!question || question.correct_choice_index === null || !question.choices) {
		return { status: 'error', message: 'Invalid submission.' };
	}

	const answerText = question.choices[selectedIndex];
	if (answerText === undefined) {
		return { status: 'error', message: 'Invalid submission.' };
	}

	const { isCorrect } = gradeMultipleChoiceAnswer(question.correct_choice_index, selectedIndex);

	const saved = await persistAnswer({ questionId, answerText, isCorrect, feedback: null });
	if (!saved) {
		return { status: 'error', message: 'Could not save your answer. Please try again.' };
	}

	return {
		status: 'graded',
		answerText,
		isCorrect,
		feedback: null,
		correctChoiceIndex: question.correct_choice_index
	};
}

/**
 * Reads the prompt and `model_answer_notes` from the database. The SvelteKit version sent
 * both from hidden inputs, which put the model answer notes — documented as "never shown to
 * the student" — into the page source before the student had answered.
 */
export async function answerShortResponseAction(
	_previous: AnswerState,
	formData: FormData
): Promise<AnswerState> {
	const questionId = String(formData.get('questionId') ?? '');
	const answerText = String(formData.get('answerText') ?? '').trim();

	if (!questionId || !answerText) {
		return { status: 'error', message: 'Please write an answer before submitting.' };
	}

	const question = await getPracticeQuestionById(questionId);
	if (!question) {
		return { status: 'error', message: 'Invalid submission.' };
	}

	let gradeResult: { isCorrect: boolean; feedback: string };
	try {
		gradeResult = await runStage3GradeAnswer({
			prompt: question.prompt,
			modelAnswerNotes: question.model_answer_notes ?? '',
			answerText
		});
	} catch (err) {
		const message =
			err instanceof PipelineStageError
				? 'AI grading timed out. Please try submitting again.'
				: 'Something went wrong grading your answer. Please try again.';
		return { status: 'error', message };
	}

	const saved = await persistAnswer({
		questionId,
		answerText,
		isCorrect: gradeResult.isCorrect,
		feedback: gradeResult.feedback
	});
	if (!saved) {
		return { status: 'error', message: 'Could not save your answer. Please try again.' };
	}

	return {
		status: 'graded',
		answerText,
		isCorrect: gradeResult.isCorrect,
		feedback: gradeResult.feedback,
		correctChoiceIndex: null
	};
}
