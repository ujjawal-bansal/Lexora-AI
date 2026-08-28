'use client';

import { useActionState, useState, type ReactNode } from 'react';
import {
	answerMultipleChoiceAction,
	answerShortResponseAction
} from '@/app/submissions/[id]/practice/actions';
import {
	initialAnswerState,
	type AnswerState,
	type PracticeQuestionView
} from '@/app/submissions/[id]/practice/answer-state';
import type { PracticeAnswer } from '@/lib/types/db';
import styles from './PracticeQuestionCard.module.css';

type ResolvedAnswer = {
	answerText: string;
	isCorrect: boolean;
	feedback: string | null;
	correctChoiceIndex: number | null;
};

/**
 * A just-submitted answer wins over the one loaded from the database; otherwise the stored
 * one shows. Deriving this on every render is what removes the Svelte version's
 * `$effect` + `untrack()` workaround — there is no local copy of server state to keep in sync.
 */
function resolveAnswer(
	state: AnswerState,
	existingAnswer: PracticeAnswer | undefined,
	questionCorrectIndex: number | null
): ResolvedAnswer | undefined {
	if (state.status === 'graded') {
		return {
			answerText: state.answerText,
			isCorrect: state.isCorrect,
			feedback: state.feedback,
			// A just-graded question learns its answer key from the action; an already-answered
			// one gets it from the page, which only sends it for questions with an answer.
			correctChoiceIndex: state.correctChoiceIndex ?? questionCorrectIndex
		};
	}
	if (existingAnswer) {
		return {
			answerText: existingAnswer.answer_text,
			isCorrect: existingAnswer.is_correct ?? false,
			feedback: existingAnswer.feedback,
			correctChoiceIndex: questionCorrectIndex
		};
	}
	return undefined;
}

function cardClassName(answer: ResolvedAnswer | undefined): string {
	if (!answer) return styles.card;
	return [
		styles.card,
		styles.isAnswered,
		answer.isCorrect ? styles.isCorrect : styles.isIncorrect
	].join(' ');
}

function Verdict({ answer, whenWrong }: { answer: ResolvedAnswer; whenWrong: string }) {
	return (
		<p
			className={`${styles.verdict} ${
				answer.isCorrect ? styles.verdictCorrect : styles.verdictIncorrect
			}`}
		>
			{answer.isCorrect ? 'Correct.' : whenWrong}
			{answer.feedback && <span className={styles.verdictFeedback}>{answer.feedback}</span>}
		</p>
	);
}

function CardShell({
	index,
	prompt,
	answer,
	errorMessage,
	children
}: {
	index: number;
	prompt: string;
	answer: ResolvedAnswer | undefined;
	errorMessage: string | null;
	children: ReactNode;
}) {
	return (
		<article className={cardClassName(answer)}>
			<header className={styles.cardHeader}>
				<span className={styles.qIndex} aria-label={`Question ${index}`}>
					{index}
				</span>
				<p className={styles.qPrompt}>{prompt}</p>
			</header>

			{children}

			{errorMessage && (
				<p className={styles.errorMsg} role="alert">
					{errorMessage}
				</p>
			)}
		</article>
	);
}

function MultipleChoiceCard({
	question,
	index,
	existingAnswer,
	choices
}: {
	question: PracticeQuestionView;
	index: number;
	existingAnswer: PracticeAnswer | undefined;
	choices: string[];
}) {
	const [state, formAction, isPending] = useActionState(
		answerMultipleChoiceAction,
		initialAnswerState
	);
	const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

	const answer = resolveAnswer(state, existingAnswer, question.correct_choice_index);
	const errorMessage = state.status === 'error' ? state.message : null;

	return (
		<CardShell index={index} prompt={question.prompt} answer={answer} errorMessage={errorMessage}>
			{answer ? (
				<>
					<ul className={`${styles.choices} ${styles.choicesResult}`}>
						{choices.map((choice, i) => {
							const isCorrectSlot = i === answer.correctChoiceIndex;
							const wasSelected = choice === answer.answerText;
							const className = [
								styles.choice,
								isCorrectSlot ? styles.choiceCorrect : '',
								wasSelected && !isCorrectSlot ? styles.choiceWrong : ''
							]
								.filter(Boolean)
								.join(' ');

							return (
								<li className={className} key={choice}>
									<span className={styles.choiceGlyph} aria-hidden="true">
										{isCorrectSlot ? '✓' : wasSelected ? '✗' : ' '}
									</span>
									{choice}
								</li>
							);
						})}
					</ul>
					<Verdict
						answer={answer}
						whenWrong="Not quite — the correct answer is highlighted above."
					/>
				</>
			) : (
				<form action={formAction}>
					<input type="hidden" name="questionId" value={question.id} />
					<input type="hidden" name="selectedIndex" value={selectedIndex ?? ''} />

					<ul className={styles.choices}>
						{choices.map((choice, i) => (
							<li key={choice}>
								<label
									className={`${styles.choiceLabel} ${
										selectedIndex === i ? styles.choiceLabelSelected : ''
									}`}
								>
									<input
										type="radio"
										name={`mcq-${question.id}`}
										checked={selectedIndex === i}
										onChange={() => setSelectedIndex(i)}
									/>
									{choice}
								</label>
							</li>
						))}
					</ul>

					<button
						className={styles.submitBtn}
						type="submit"
						disabled={selectedIndex === null || isPending}
					>
						{isPending ? 'Checking…' : 'Submit'}
					</button>
				</form>
			)}
		</CardShell>
	);
}

function ShortResponseCard({
	question,
	index,
	existingAnswer
}: {
	question: PracticeQuestionView;
	index: number;
	existingAnswer: PracticeAnswer | undefined;
}) {
	const [state, formAction, isPending] = useActionState(
		answerShortResponseAction,
		initialAnswerState
	);
	const [text, setText] = useState('');

	const answer = resolveAnswer(state, existingAnswer, null);
	const errorMessage = state.status === 'error' ? state.message : null;

	return (
		<CardShell index={index} prompt={question.prompt} answer={answer} errorMessage={errorMessage}>
			{answer ? (
				<>
					<div className={styles.submittedAnswer}>
						<p className={styles.submittedLabel}>Your answer</p>
						<p className={styles.submittedText}>{answer.answerText}</p>
					</div>
					<Verdict answer={answer} whenWrong="Not quite." />
				</>
			) : (
				<form action={formAction}>
					<input type="hidden" name="questionId" value={question.id} />

					<textarea
						name="answerText"
						value={text}
						onChange={(event) => setText(event.target.value)}
						placeholder="Write your answer here…"
						disabled={isPending}
						rows={4}
					/>

					<button
						className={styles.submitBtn}
						type="submit"
						disabled={text.trim().length === 0 || isPending}
					>
						{isPending ? (
							<>
								<span className={styles.btnSpinner} aria-hidden="true" />
								Grading…
							</>
						) : (
							'Submit answer'
						)}
					</button>
				</form>
			)}
		</CardShell>
	);
}

export default function PracticeQuestionCard({
	question,
	index,
	existingAnswer
}: {
	question: PracticeQuestionView;
	index: number;
	existingAnswer: PracticeAnswer | undefined;
}) {
	if (question.question_type === 'multiple_choice' && question.choices) {
		return (
			<MultipleChoiceCard
				question={question}
				index={index}
				existingAnswer={existingAnswer}
				choices={question.choices}
			/>
		);
	}

	if (question.question_type === 'short_response') {
		return (
			<ShortResponseCard question={question} index={index} existingAnswer={existingAnswer} />
		);
	}

	return null;
}
