import { createSupabaseServerClient } from '@/lib/server/db/client';
import { runStage1Grade } from './stage1-grade';
import { runStage2Questions } from './stage2-questions';
import { PipelineStageError } from './client';
import { validateEssayText } from './validate-essay';

export type SubmitEssayResult =
	| { ok: true; submissionId: string }
	| { ok: false; submissionId: string | null; errorMessage: string };

/**
 * Runs Stage 1 (grade + extract mistakes) then Stage 2 (generate practice questions),
 * and persists the full result in one go. If either Groq call fails, the submission is
 * marked 'failed' with an error_message instead of partially persisting mistakes/questions.
 */
export async function submitEssay(args: {
	sessionId: string;
	essayText: string;
	classId?: string;
}): Promise<SubmitEssayResult> {
	const validation = validateEssayText(args.essayText);
	if (!validation.ok) {
		return { ok: false, submissionId: null, errorMessage: validation.message };
	}

	const supabase = createSupabaseServerClient();

	const { data: submission, error: insertError } = await supabase
		.from('submissions')
		.insert({
			session_id: args.sessionId,
			essay_text: args.essayText,
			overall_feedback: null,
			status: 'pending',
			error_message: null,
			class_id: args.classId ?? null
		})
		.select()
		.single();

	if (insertError || !submission) {
		throw new Error(`Failed to create submission: ${insertError?.message}`);
	}

	try {
		const { overallFeedback, mistakes } = await runStage1Grade(args.essayText);
		const questionDrafts = await runStage2Questions(args.essayText, mistakes);

		if (mistakes.length > 0) {
			const { error: mistakesError } = await supabase.from('mistakes').insert(
				mistakes.map((m) => ({
					submission_id: submission.id,
					category: m.category,
					quote: m.quote,
					explanation: m.explanation
				}))
			);
			if (mistakesError) {
				throw new Error(`Failed to persist mistakes: ${mistakesError.message}`);
			}
		}

		if (questionDrafts.length > 0) {
			const { error: questionsError } = await supabase.from('practice_questions').insert(
				questionDrafts.map((q) => ({
					submission_id: submission.id,
					category: q.category,
					question_type: q.question_type,
					prompt: q.prompt,
					choices: q.choices,
					correct_choice_index: q.correct_choice_index,
					model_answer_notes: q.model_answer_notes
				}))
			);
			if (questionsError) {
				throw new Error(`Failed to persist practice questions: ${questionsError.message}`);
			}
		}

		const { error: updateError } = await supabase
			.from('submissions')
			.update({ overall_feedback: overallFeedback, status: 'graded' })
			.eq('id', submission.id);

		if (updateError) {
			throw new Error(`Failed to finalize submission: ${updateError.message}`);
		}

		return { ok: true, submissionId: submission.id };
	} catch (err) {
		const errorMessage = toUserFacingErrorMessage(err);

		await supabase
			.from('submissions')
			.update({ status: 'failed', error_message: errorMessage })
			.eq('id', submission.id);

		return { ok: false, submissionId: submission.id, errorMessage };
	}
}

function toUserFacingErrorMessage(err: unknown): string {
	if (err instanceof PipelineStageError) {
		const message = err.message.toLowerCase();
		if (message.includes('timed out')) {
			return 'AI service timed out. Please try again.';
		}
		if (message.includes('model is unavailable')) {
			return 'AI model is currently unavailable. Please try again in a moment.';
		}
		return 'AI service returned an unexpected response. Please try again.';
	}
	console.error('Unexpected pipeline error:', err);
	return 'Something went wrong while grading your essay. Please try again.';
}

export type SubmitClassBatchResult =
	| { ok: true; classId: string; submissionResults: SubmitEssayResult[] }
	| { ok: false; errorMessage: string };

/**
 * Creates a class batch and runs the per-essay pipeline (Stage 1 + 2) for every essay
 * in parallel via Promise.all. Each essay's pipeline failure/success is independent —
 * one essay failing does not block or fail the others, matching the per-submission
 * failure model already used for single-essay grading.
 */
export async function submitClassBatch(args: {
	sessionId: string;
	essays: string[];
	className?: string;
}): Promise<SubmitClassBatchResult> {
	if (args.essays.length < 2) {
		return { ok: false, errorMessage: 'Please provide at least 2 essays for class mode.' };
	}
	if (args.essays.length > 10) {
		return { ok: false, errorMessage: 'Class mode supports up to 10 essays at a time.' };
	}

	const supabase = createSupabaseServerClient();

	const { data: classRow, error: classError } = await supabase
		.from('classes')
		.insert({ session_id: args.sessionId, name: args.className ?? null })
		.select()
		.single();

	if (classError || !classRow) {
		return { ok: false, errorMessage: 'Could not create the class batch. Please try again.' };
	}

	const submissionResults = await Promise.all(
		args.essays.map((essayText) =>
			submitEssay({ sessionId: args.sessionId, essayText, classId: classRow.id })
		)
	);

	return { ok: true, classId: classRow.id, submissionResults };
}
