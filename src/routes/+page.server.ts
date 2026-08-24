import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { submitEssay } from '$lib/server/ai/pipeline';

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const formData = await request.formData();
		const essayText = String(formData.get('essay') ?? '');

		const result = await submitEssay({ sessionId: locals.sessionId, essayText });

		if (!result.ok) {
			return fail(422, { essayText, errorMessage: result.errorMessage });
		}

		redirect(303, `/submissions/${result.submissionId}`);
	}
};
