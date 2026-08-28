import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import PracticeQuestionCard from '@/components/PracticeQuestionCard';
import { CATEGORY_LABELS, GROUP_LABELS, categoryGroup } from '@/lib/categories';
import {
	getMistakesForSubmission,
	getPracticeAnswersForSession,
	getPracticeQuestionsForSubmission,
	getSubmissionForSession
} from '@/lib/server/db/queries';
import { getSessionId } from '@/lib/session';
import type { PracticeQuestionView } from './answer-state';
import type { MistakeCategory, PracticeAnswer, PracticeQuestion } from '@/lib/types/db';
import styles from './practice.module.css';

export const metadata: Metadata = { title: 'Practice' };

type Group = { category: MistakeCategory; items: PracticeQuestion[] };

/**
 * Narrows a row to what the client card may see. `model_answer_notes` never crosses over,
 * and the answer key only does once the question has been answered — props to a client
 * component are serialized into the page, so anything included here is readable in source.
 */
function toView(question: PracticeQuestion, isAnswered: boolean): PracticeQuestionView {
	return {
		id: question.id,
		category: question.category,
		question_type: question.question_type,
		prompt: question.prompt,
		choices: question.choices,
		correct_choice_index: isAnswered ? question.correct_choice_index : null
	};
}

function buildGroups(items: PracticeQuestion[], group: 'grammar' | 'structure'): Group[] {
	const byCategory = new Map<MistakeCategory, PracticeQuestion[]>();
	for (const question of items) {
		if (categoryGroup(question.category) !== group) continue;
		const existing = byCategory.get(question.category);
		if (existing) existing.push(question);
		else byCategory.set(question.category, [question]);
	}
	return Array.from(byCategory.entries()).map(([category, its]) => ({ category, items: its }));
}

function GroupSection({
	groups,
	group,
	questionIndex,
	answers
}: {
	groups: Group[];
	group: 'grammar' | 'structure';
	questionIndex: Map<string, number>;
	answers: Record<string, PracticeAnswer>;
}) {
	return (
		<section className={styles.groupSection}>
			<header className={styles.groupHeader}>
				<span className={`${styles.groupDot} ${styles[group]}`} aria-hidden="true" />
				<h2 className={styles.groupLabel}>{GROUP_LABELS[group]}</h2>
			</header>

			{groups.map((entry) => (
				<div className={styles.categoryBlock} key={entry.category}>
					<h3 className={styles.categoryName}>{CATEGORY_LABELS[entry.category]}</h3>
					<div className={styles.questionStack}>
						{entry.items.map((question) => (
							<PracticeQuestionCard
								key={question.id}
								question={toView(question, Boolean(answers[question.id]))}
								index={questionIndex.get(question.id) ?? 0}
								existingAnswer={answers[question.id]}
							/>
						))}
					</div>
				</div>
			))}
		</section>
	);
}

export default async function PracticePage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const sessionId = await getSessionId();

	const submission = await getSubmissionForSession(id, sessionId);
	if (!submission) {
		notFound();
	}

	const [questions, mistakeCount] = await Promise.all([
		getPracticeQuestionsForSubmission(submission.id),
		getMistakesForSubmission(submission.id).then((m) => m.length)
	]);

	const answerRows = await getPracticeAnswersForSession(
		questions.map((q) => q.id),
		sessionId
	);

	// Most recent answer per question (rows are ordered created_at desc).
	const latestAnswerByQuestion = new Map<string, PracticeAnswer>();
	for (const answer of answerRows) {
		if (!latestAnswerByQuestion.has(answer.practice_question_id)) {
			latestAnswerByQuestion.set(answer.practice_question_id, answer);
		}
	}
	const answers = Object.fromEntries(latestAnswerByQuestion);

	const grammarGroups = buildGroups(questions, 'grammar');
	const structureGroups = buildGroups(questions, 'structure');
	const categoryCount = grammarGroups.length + structureGroups.length;

	const questionIndex = new Map<string, number>();
	let n = 0;
	for (const group of [...grammarGroups, ...structureGroups]) {
		for (const question of group.items) {
			n += 1;
			questionIndex.set(question.id, n);
		}
	}

	return (
		<main className={styles.page}>
			<Link href={`/submissions/${submission.id}`} className={styles.backLink}>
				← Back to results
			</Link>

			<header className={styles.masthead}>
				<p className={styles.eyebrow}>Targeted practice</p>
				<h1>Practice what you missed</h1>
				{questions.length > 0 && (
					<p className={styles.subtitle}>
						{questions.length} question{questions.length !== 1 ? 's' : ''} across{' '}
						{categoryCount} {categoryCount !== 1 ? 'categories' : 'category'}
					</p>
				)}
			</header>

			{questions.length === 0 ? (
				<section className={styles.emptyState}>
					<div className={styles.emptyIcon} aria-hidden="true">
						★
					</div>
					<h2>Nothing to practice</h2>
					<p>
						{mistakeCount === 0
							? "No mistakes were found in your essay, so there's nothing to practice."
							: "Practice questions couldn't be generated for this submission."}
					</p>
					<Link href="/" className={styles.emptyCta}>
						Submit another essay
					</Link>
				</section>
			) : (
				<>
					{grammarGroups.length > 0 && (
						<GroupSection
							groups={grammarGroups}
							group="grammar"
							questionIndex={questionIndex}
							answers={answers}
						/>
					)}

					{grammarGroups.length > 0 && structureGroups.length > 0 && (
						<hr className={styles.sectionDivider} />
					)}

					{structureGroups.length > 0 && (
						<GroupSection
							groups={structureGroups}
							group="structure"
							questionIndex={questionIndex}
							answers={answers}
						/>
					)}
				</>
			)}
		</main>
	);
}
