// Seeds fake submissions/mistakes/practice data for local development.
// Run with: npm run db:seed
// Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) in env.

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import type { Database, Mistake, PracticeQuestion, Submission } from '../../src/lib/types/db';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
	console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/SUPABASE_ANON_KEY in env.');
	process.exit(1);
}

const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
	auth: { persistSession: false }
});

// Fixed UUID so seeded data is reachable via a known session_id cookie during local dev.
const DEV_SESSION_ID = '00000000-0000-0000-0000-000000000001';

const ESSAY_WITH_MISTAKES = `Many people believes that social media have changed the way teenagers communicate today. In the past, friends would talk on the phone for hours, now they just text or send pictures that disappear in seconds. This essay will discuss why this matters.

First, social media effect how teenagers learn empathy. When you can't see someones face you don't always realize when you've hurt they're feelings. Some researchers say this is making kids more anxious, others say its just a new normal that adults don't understand. Its hard to know whats really true. I think both sides make good points but nobody have done a long enough study to really prove anything.

Second, teenagers today are constantly comparing themselves to influencers, this creates unrealistic expectations about appearance and lifestyle. A girl post a photo and within minutes she is getting judged by hundreds of strangers, this kind of pressure didn't really exist before smartphones were everywhere.

In conclusion social media is bad. Schools should teach digital literacy classes so students learn how to use these tools responsibly, because right now most teenagers are just figuring it out on they're own with no guidance at all from adults who barely understand the platforms themselves.`;

const ESSAY_CLEAN = `The Industrial Revolution fundamentally transformed how societies organized labor, capital, and daily life. Beginning in Britain in the late eighteenth century, it introduced mechanized production that displaced traditional artisanal work and concentrated populations in rapidly growing industrial cities.

This shift had two major consequences worth examining. First, it created an entirely new economic class structure. Factory owners accumulated unprecedented wealth, while industrial laborers, including many children, worked long hours under harsh conditions for low wages. This disparity eventually fueled labor movements that secured rights still recognized today, such as limits on working hours and minimum safety standards.

Second, the Industrial Revolution accelerated urbanization at a scale the world had not previously seen. Cities like Manchester grew from small towns into major industrial centers within a few decades, straining housing, sanitation, and public health infrastructure. These pressures, in turn, prompted some of the earliest public health reforms, including investments in clean water systems and building codes.

In short, the Industrial Revolution was not merely a technological shift but a structural one, reshaping economic relationships and urban life in ways whose effects are still visible in modern industrialized societies.`;

const ESSAY_PENDING = `Climate change is one of the biggest issues facing the world today and it effect everyone no matter where they live. Some countries are dealing with rising sea levels while others are dealing with drought, its a global problem that needs a global solution. Governments needs to work together more then they currently do.`;

const ESSAY_FAILED = `The history of the printing press is a topic that deserves more attention than it typically receives in standard history curricula.`;

type SeedMistake = Pick<Mistake, 'category' | 'quote' | 'explanation'>;

type SeedQuestion = Pick<
	PracticeQuestion,
	'category' | 'question_type' | 'prompt' | 'choices' | 'correct_choice_index' | 'model_answer_notes'
>;

const MISTAKES_FOR_ESSAY_1: SeedMistake[] = [
	{
		category: 'subject_verb_agreement',
		quote: 'Many people believes that social media have changed',
		explanation: '"People" is plural and takes "believe," not "believes."'
	},
	{
		category: 'subject_verb_agreement',
		quote: 'social media effect how teenagers learn empathy',
		explanation: '"Social media" is acting as the subject here and should pair with "affects" (verb), not "effect" (noun) — also a word-choice slip, but the subject/verb form is the core agreement issue: "affects."'
	},
	{
		category: 'comma_splice',
		quote: "In the past, friends would talk on the phone for hours, now they just text",
		explanation: 'Two independent clauses ("friends would talk... for hours" and "now they just text...") are joined only by a comma. Needs a semicolon, period, or conjunction.'
	},
	{
		category: 'comma_splice',
		quote: 'A girl post a photo and within minutes she is getting judged by hundreds of strangers, this kind of pressure',
		explanation: 'Another comma splice joining two independent clauses; also contains a subject/verb agreement slip ("A girl post" should be "posts").'
	},
	{
		category: 'run_on_sentence',
		quote: "Some researchers say this is making kids more anxious, others say its just a new normal that adults don't understand. Its hard to know whats really true.",
		explanation: 'Multiple independent clauses are strung together without clear separation, making the argument hard to follow.'
	},
	{
		category: 'thesis_clarity',
		quote: 'This essay will discuss why this matters.',
		explanation: 'The thesis is vague — it announces that the essay will discuss "why this matters" without stating an actual position or claim about social media\'s effect on teenagers.'
	},
	{
		category: 'weak_evidence',
		quote: 'Some researchers say this is making kids more anxious, others say its just a new normal',
		explanation: 'Claims are attributed to unnamed "researchers" with no citation, specific study, or data — too vague to count as evidence.'
	},
	{
		category: 'logical_flow',
		quote: 'In conclusion social media is bad.',
		explanation: 'This conclusion asserts a flat, sweeping judgment ("social media is bad") that doesn\'t follow from the more nuanced, two-sided discussion in the body paragraphs.'
	}
];

const MISTAKES_FOR_ESSAY_PENDING: SeedMistake[] = [
	{
		category: 'subject_verb_agreement',
		quote: 'it effect everyone no matter where they live',
		explanation: '"It" is singular and requires "affects," not "effect."'
	},
	{
		category: 'tense_consistency',
		quote: 'Governments needs to work together more then they currently do.',
		explanation: '"Governments" is plural and should pair with "need," not "needs"; this also breaks tense/number agreement with the surrounding present-tense discussion.'
	}
];

const QUESTIONS_FOR_ESSAY_1: SeedQuestion[] = [
	{
		category: 'subject_verb_agreement',
		question_type: 'multiple_choice',
		prompt:
			'Your essay included: "Many people believes that social media have changed the way teenagers communicate." Which correction fixes the subject-verb agreement error?',
		choices: [
			'Many people believes that social media has changed...',
			'Many people believe that social media have changed...',
			'Many people believing that social media have changed...',
			'Many person believes that social media have changed...'
		],
		correct_choice_index: 1,
		model_answer_notes: null
	},
	{
		category: 'comma_splice',
		question_type: 'multiple_choice',
		prompt:
			'Your essay had: "In the past, friends would talk on the phone for hours, now they just text." What is the best way to fix this comma splice?',
		choices: [
			'Leave it as-is, it reads fine with a comma.',
			'In the past, friends would talk on the phone for hours; now they just text.',
			'In the past friends, would talk on the phone for hours now, they just text.',
			'In the past, friends would, talk on the phone for hours now they just text.'
		],
		correct_choice_index: 1,
		model_answer_notes: null
	},
	{
		category: 'run_on_sentence',
		question_type: 'multiple_choice',
		prompt:
			'Which revision best breaks up this run-on: "Some researchers say this is making kids more anxious, others say its just a new normal that adults don\'t understand."?',
		choices: [
			'Some researchers say this is making kids more anxious. Others say it\'s just a new normal that adults don\'t understand.',
			'Some researchers say this is making kids more anxious others say its just a new normal.',
			'Some researchers, say this is making kids more anxious, others, say its just a new normal.',
			'Leave the sentence unchanged.'
		],
		correct_choice_index: 0,
		model_answer_notes: null
	},
	{
		category: 'thesis_clarity',
		question_type: 'short_response',
		prompt:
			'Your essay\'s thesis was "This essay will discuss why this matters." Rewrite this as a specific, arguable thesis statement about social media\'s effect on teenagers.',
		choices: null,
		correct_choice_index: null,
		model_answer_notes:
			'A strong answer states a specific, debatable claim (e.g. social media\'s effect on teen empathy/anxiety is net negative/positive/mixed) rather than announcing the topic. It should avoid vague phrases like "this matters" or "this essay will discuss."'
	},
	{
		category: 'weak_evidence',
		question_type: 'short_response',
		prompt:
			'Your essay cited "some researchers" without naming a study. What information would you need to add to make this evidence credible?',
		choices: null,
		correct_choice_index: null,
		model_answer_notes:
			'A strong answer mentions specifics: a named study, researcher, institution, publication, year, or data/statistics — something a reader could verify, instead of an anonymous, vague attribution.'
	},
	{
		category: 'logical_flow',
		question_type: 'short_response',
		prompt:
			'Your conclusion stated "social media is bad," but the body paragraphs presented both positive and negative points. How would you revise the conclusion to logically follow from the body?',
		choices: null,
		correct_choice_index: null,
		model_answer_notes:
			'A strong answer acknowledges the mixed/nuanced evidence from the body paragraphs and proposes a conclusion that reflects that nuance (e.g. a qualified claim, trade-offs, or conditions) rather than a flat unsupported judgment.'
	}
];

const QUESTIONS_FOR_ESSAY_PENDING: SeedQuestion[] = [
	{
		category: 'subject_verb_agreement',
		question_type: 'multiple_choice',
		prompt:
			'Your essay said: "it effect everyone no matter where they live." Which correction is right?',
		choices: ['it effect everyone', 'it effects everyone', 'it affects everyone', 'it affect everyone'],
		correct_choice_index: 2,
		model_answer_notes: null
	},
	{
		category: 'tense_consistency',
		question_type: 'multiple_choice',
		prompt: 'Your essay said: "Governments needs to work together more then they currently do." Which correction fixes the agreement error?',
		choices: [
			'Governments need to work together more then they currently do.',
			'Governments needs to work together more than they currently do.',
			'Governments need to work together more than they currently do.',
			'Government need to work together more then they currently do.'
		],
		correct_choice_index: 2,
		model_answer_notes: null
	}
];

async function main() {
	console.log('Seeding database...');

	// Clear existing seeded data for this dev session so the script is re-runnable.
	const { data: existing } = await supabase
		.from('submissions')
		.select('id')
		.eq('session_id', DEV_SESSION_ID);

	if (existing && existing.length > 0) {
		const ids = existing.map((row) => row.id);
		await supabase.from('submissions').delete().in('id', ids);
		console.log(`Removed ${ids.length} previously seeded submission(s).`);
	}

	// 1. Submission with mistakes across grammar + structure categories, fully graded with practice questions.
	const submission1 = await insertSubmission({
		essay_text: ESSAY_WITH_MISTAKES,
		overall_feedback:
			'This essay raises an interesting question about social media and teen communication, but the argument is undercut by several grammar issues and a thesis that never states a clear position. Strengthen the thesis, cite specific evidence instead of vague references to "researchers," and make sure the conclusion follows from the nuance shown in the body paragraphs.',
		status: 'graded'
	});
	await insertMistakes(submission1.id, MISTAKES_FOR_ESSAY_1);
	await insertQuestions(submission1.id, QUESTIONS_FOR_ESSAY_1);
	console.log(`Seeded graded submission with mistakes: ${submission1.id}`);

	// 2. Clean essay, well-written, zero mistakes -- exercises the "no major issues found" empty state.
	const submission2 = await insertSubmission({
		essay_text: ESSAY_CLEAN,
		overall_feedback:
			'Well organized and clearly argued. The thesis is specific, each body paragraph develops one consequence of the Industrial Revolution with concrete detail, and the conclusion ties back to the thesis without overreaching.',
		status: 'graded'
	});
	console.log(`Seeded graded submission with zero mistakes: ${submission2.id}`);

	// 3. Pending submission -- pipeline hasn't completed yet (e.g. mid-processing), partial mistakes for display purposes only.
	const submission3 = await insertSubmission({
		essay_text: ESSAY_PENDING,
		overall_feedback: null,
		status: 'pending'
	});
	await insertMistakes(submission3.id, MISTAKES_FOR_ESSAY_PENDING);
	console.log(`Seeded pending submission: ${submission3.id}`);

	// 4. Failed submission -- exercises the retry-without-losing-essay-text edge case.
	const submission4 = await insertSubmission({
		essay_text: ESSAY_FAILED,
		overall_feedback: null,
		status: 'failed',
		error_message: 'Groq API request timed out after 30s.'
	});
	console.log(`Seeded failed submission: ${submission4.id}`);

	console.log('\nDone. Dev session_id for browsing seeded data:');
	console.log(DEV_SESSION_ID);
}

async function insertSubmission(input: {
	essay_text: string;
	overall_feedback: string | null;
	status: Submission['status'];
	error_message?: string;
}): Promise<Submission> {
	const { data, error } = await supabase
		.from('submissions')
		.insert({
			session_id: DEV_SESSION_ID,
			essay_text: input.essay_text,
			overall_feedback: input.overall_feedback,
			status: input.status,
			error_message: input.error_message ?? null
		})
		.select()
		.single();

	if (error || !data) {
		throw new Error(`Failed to insert submission: ${error?.message}`);
	}
	return data;
}

async function insertMistakes(submissionId: string, mistakes: SeedMistake[]) {
	if (mistakes.length === 0) return;
	const { error } = await supabase.from('mistakes').insert(
		mistakes.map((m) => ({
			submission_id: submissionId,
			category: m.category,
			quote: m.quote,
			explanation: m.explanation
		}))
	);
	if (error) {
		throw new Error(`Failed to insert mistakes: ${error.message}`);
	}
}

async function insertQuestions(submissionId: string, questions: SeedQuestion[]) {
	if (questions.length === 0) return;
	const { error } = await supabase.from('practice_questions').insert(
		questions.map((q) => ({
			submission_id: submissionId,
			category: q.category,
			question_type: q.question_type,
			prompt: q.prompt,
			choices: q.choices,
			correct_choice_index: q.correct_choice_index,
			model_answer_notes: q.model_answer_notes
		}))
	);
	if (error) {
		throw new Error(`Failed to insert practice questions: ${error.message}`);
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
