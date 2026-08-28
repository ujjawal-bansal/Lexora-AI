'use client';

import { useActionState, useEffect, useState } from 'react';
import { askClassAction } from '@/app/class/[id]/actions';
import { initialClassQueryState } from '@/app/class/[id]/query-state';
import styles from './ClassQuery.module.css';

const SUGGESTED_QUESTIONS = [
	'What are the top 3 issues across the class?',
	'Which students need the most structural work?',
	'What grammar issues are most common?'
];

export default function ClassQuery({ classId }: { classId: string }) {
	const [state, formAction, isPending] = useActionState(askClassAction, initialClassQueryState);
	const [question, setQuestion] = useState('');

	// Clear the box only once an answer has actually landed, so a failed ask keeps
	// what was typed.
	const answerCount = state.history.length;
	useEffect(() => {
		if (answerCount > 0) setQuestion('');
	}, [answerCount]);

	return (
		<section className={styles.querySection}>
			<h2 className={styles.sectionTitle}>Ask about this class</h2>

			<form action={formAction} className={styles.queryForm}>
				<input type="hidden" name="classId" value={classId} />
				<input
					type="text"
					name="question"
					value={question}
					onChange={(event) => setQuestion(event.target.value)}
					placeholder="e.g. What grammar issues are most common?"
					disabled={isPending}
					className={styles.queryInput}
				/>
				<button
					type="submit"
					className={styles.querySubmit}
					disabled={!question.trim() || isPending}
				>
					{isPending ? 'Thinking…' : 'Ask'}
				</button>
			</form>

			{state.history.length === 0 && (
				<div className={styles.suggestedQuestions}>
					{SUGGESTED_QUESTIONS.map((suggestion) => (
						<button
							type="button"
							className={styles.suggestedChip}
							onClick={() => setQuestion(suggestion)}
							key={suggestion}
						>
							{suggestion}
						</button>
					))}
				</div>
			)}

			{state.error && (
				<p className={styles.queryError} role="alert">
					{state.error}
				</p>
			)}

			{state.history.length > 0 && (
				<div className={styles.queryHistory}>
					{state.history.map((item, i) => (
						<div className={styles.queryAnswerCard} key={`${i}-${item.question}`}>
							<p className={styles.queryQ}>{item.question}</p>
							<p className={styles.queryA}>{item.answer}</p>
						</div>
					))}
				</div>
			)}
		</section>
	);
}
