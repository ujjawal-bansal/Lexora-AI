import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createSupabaseServerClient } from '$lib/server/db/client';
import { buildClassAggregate } from '$lib/server/db/class-aggregation';
import { runClassQuery } from '$lib/server/ai/stage4-class-query';
import { PipelineStageError } from '$lib/server/ai/client';

export const load: PageServerLoad = async ({ params, locals }) => {
	const supabase = createSupabaseServerClient();

	const { data: classRow } = await supabase
		.from('classes')
		.select('*')
		.eq('id', params.id)
		.eq('session_id', locals.sessionId)
		.maybeSingle();

	if (!classRow) {
		error(404, 'Class not found');
	}

	const aggregate = await buildClassAggregate(classRow.id);

	return { classRow, aggregate };
};

export const actions: Actions = {
	query: async ({ request, params }) => {
		const formData = await request.formData();
		const question = String(formData.get('question') ?? '').trim();

		if (!question) {
			return fail(400, { message: 'Please enter a question.' });
		}

		const aggregate = await buildClassAggregate(params.id);

		if (aggregate.totalMistakes === 0) {
			return {
				question,
				answer: "There's no mistake data yet for this class — once essays are graded, you'll be able to ask questions about the patterns."
			};
		}

		try {
			const answer = await runClassQuery(aggregate, question);
			return { question, answer };
		} catch (err) {
			const message =
				err instanceof PipelineStageError
					? 'AI service timed out answering that question. Please try again.'
					: 'Something went wrong answering that question. Please try again.';
			return fail(502, { message, question });
		}
	}
};
