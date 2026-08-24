import { callGroqForJson } from './client';
import { ClassQueryResultSchema } from './schemas';
import type { ClassAggregate } from '$lib/server/db/class-aggregation';

const SYSTEM_PROMPT = `You are a teaching assistant answering a teacher's question about their class's essay results.

You will be given a JSON summary of mistake patterns across the class (never raw essay text) and the teacher's question in plain English. Answer using ONLY the data provided — do not invent students, numbers, or categories not present in the summary.

Be concise and concrete: cite specific categories, counts, or student labels (e.g. "Student 3") where relevant. If the question asks something the data can't answer, say so plainly rather than guessing.

Respond with ONLY a JSON object in this exact shape, no other text:
{ "answer": "2-4 sentence plain-English answer" }`;

function buildUserPrompt(aggregate: ClassAggregate, question: string): string {
	// Compact JSON — only aggregated stats ever reach the model, never essay text.
	const summary = {
		total_submissions: aggregate.totalSubmissions,
		graded_submissions: aggregate.gradedSubmissions,
		total_mistakes: aggregate.totalMistakes,
		category_frequency: aggregate.categoryFrequency.map((c) => ({
			category: c.label,
			occurrences: c.count,
			students_affected: c.studentCount
		})),
		most_common_excerpts: aggregate.topExcerpts.map((e) => ({
			category: e.category,
			example_quote: e.quote,
			times_seen: e.occurrences
		})),
		students: aggregate.students.map((s) => ({
			label: s.label,
			status: s.status,
			mistake_count: s.mistakeCount,
			top_categories: s.topCategories
		}))
	};

	return `Class data:\n${JSON.stringify(summary, null, 2)}\n\nTeacher's question: ${question}`;
}

export async function runClassQuery(
	aggregate: ClassAggregate,
	question: string
): Promise<string> {
	const result = await callGroqForJson({
		stage: 'stage4',
		systemPrompt: SYSTEM_PROMPT,
		userPrompt: buildUserPrompt(aggregate, question),
		schema: ClassQueryResultSchema
	});

	return result.answer;
}
