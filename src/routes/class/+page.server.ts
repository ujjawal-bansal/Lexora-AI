import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { submitClassBatch } from '$lib/server/ai/pipeline';

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const formData = await request.formData();
		const className = String(formData.get('className') ?? '').trim() || undefined;
		const essays = formData
			.getAll('essay')
			.map((v) => String(v))
			.filter((text) => text.trim().length > 0);

		const result = await submitClassBatch({ sessionId: locals.sessionId, essays, className });

		if (!result.ok) {
			return fail(422, { essays, className, errorMessage: result.errorMessage });
		}

		redirect(303, `/class/${result.classId}`);
	}
};
