<script lang="ts">
	import { enhance } from '$app/forms';
	import { untrack } from 'svelte';
	import type { PracticeAnswer, PracticeQuestion } from '$lib/types/db';

	let {
		question,
		index,
		existingAnswer
	}: {
		question: PracticeQuestion;
		index: number;
		existingAnswer: PracticeAnswer | undefined;
	} = $props();

	// Sync from prop only when it actually changes (e.g. page reload), not on every render.
	// We also set `answer` locally after a successful submit, so we can't just use a $derived.
	let answer = $state<PracticeAnswer | undefined>(undefined);

	$effect(() => {
		// Read existingAnswer reactively; write to answer without triggering this effect again.
		const incoming = existingAnswer;
		untrack(() => {
			if (answer === undefined || incoming !== undefined) {
				answer = incoming;
			}
		});
	});

	let selectedIndex = $state<number | null>(null);
	let shortResponseText = $state('');
	let isSubmitting = $state(false);
	let submitError = $state<string | null>(null);

	let isAnswered = $derived(answer !== undefined);

	type EnhanceResult = {
		result: { type: string; data?: Record<string, unknown> };
		update: () => Promise<void>;
	};

	function handleMCQ() {
		isSubmitting = true;
		submitError = null;
		return async ({ result, update }: EnhanceResult) => {
			isSubmitting = false;
			if (result.type === 'failure') {
				submitError = (result.data?.message as string) ?? 'Something went wrong.';
				return;
			}
			if (result.type === 'success' && selectedIndex !== null && question.choices) {
				answer = {
					id: 'local',
					practice_question_id: question.id,
					session_id: '',
					answer_text: question.choices[selectedIndex],
					is_correct: (result.data?.isCorrect as boolean) ?? false,
					feedback: null,
					created_at: new Date().toISOString()
				};
			}
			await update();
		};
	}

	function handleShortResponse() {
		isSubmitting = true;
		submitError = null;
		return async ({ result, update }: EnhanceResult) => {
			isSubmitting = false;
			if (result.type === 'failure') {
				submitError = (result.data?.message as string) ?? 'Something went wrong.';
				return;
			}
			if (result.type === 'success') {
				answer = {
					id: 'local',
					practice_question_id: question.id,
					session_id: '',
					answer_text: shortResponseText,
					is_correct: (result.data?.isCorrect as boolean) ?? false,
					feedback: (result.data?.feedback as string) ?? null,
					created_at: new Date().toISOString()
				};
			}
			await update();
		};
	}
</script>

<article class="card" class:is-answered={isAnswered} class:is-correct={isAnswered && answer?.is_correct} class:is-incorrect={isAnswered && !answer?.is_correct}>
	<header class="card-header">
		<span class="q-index" aria-label="Question {index}">{index}</span>
		<p class="q-prompt">{question.prompt}</p>
	</header>

	{#if question.question_type === 'multiple_choice' && question.choices}
		{#if isAnswered && answer}
			<ul class="choices choices--result">
				{#each question.choices as choice, i (choice)}
					{@const isCorrectSlot = i === question.correct_choice_index}
					{@const wasSelected = choice === answer.answer_text}
					<li
						class="choice"
						class:choice--correct={isCorrectSlot}
						class:choice--wrong={wasSelected && !isCorrectSlot}
					>
						<span class="choice-glyph" aria-hidden="true">
							{#if isCorrectSlot}✓{:else if wasSelected}✗{:else}&nbsp;{/if}
						</span>
						{choice}
					</li>
				{/each}
			</ul>
			<p class="verdict" class:verdict--correct={answer.is_correct} class:verdict--incorrect={!answer.is_correct}>
				{answer.is_correct ? 'Correct.' : 'Not quite — the correct answer is highlighted above.'}
			</p>
		{:else}
			<form method="POST" action="?/answerMultipleChoice" use:enhance={handleMCQ}>
				<input type="hidden" name="questionId" value={question.id} />
				<input type="hidden" name="correctIndex" value={question.correct_choice_index} />
				<input type="hidden" name="selectedIndex" value={selectedIndex ?? ''} />
				<input type="hidden" name="answerText" value={selectedIndex !== null && question.choices ? question.choices[selectedIndex] : ''} />

				<ul class="choices">
					{#each question.choices as choice, i (choice)}
						<li>
							<label class="choice-label" class:choice-label--selected={selectedIndex === i}>
								<input
									type="radio"
									name="mcq-{question.id}"
									onchange={() => (selectedIndex = i)}
								/>
								{choice}
							</label>
						</li>
					{/each}
				</ul>

				<button class="submit-btn" type="submit" disabled={selectedIndex === null || isSubmitting}>
					{isSubmitting ? 'Checking…' : 'Submit'}
				</button>
			</form>
		{/if}

	{:else if question.question_type === 'short_response'}
		{#if isAnswered && answer}
			<div class="submitted-answer">
				<p class="submitted-label">Your answer</p>
				<p class="submitted-text">{answer.answer_text}</p>
			</div>
			<p class="verdict" class:verdict--correct={answer.is_correct} class:verdict--incorrect={!answer.is_correct}>
				{answer.is_correct ? 'Correct.' : 'Not quite.'}
				{#if answer.feedback}
					<span class="verdict-feedback">{answer.feedback}</span>
				{/if}
			</p>
		{:else}
			<form
				method="POST"
				action="?/answerShortResponse"
				use:enhance={handleShortResponse}
			>
				<input type="hidden" name="questionId" value={question.id} />
				<input type="hidden" name="prompt" value={question.prompt} />
				<input type="hidden" name="modelAnswerNotes" value={question.model_answer_notes ?? ''} />

				<textarea
					name="answerText"
					bind:value={shortResponseText}
					placeholder="Write your answer here…"
					disabled={isSubmitting}
					rows="4"
				></textarea>

				<button
					class="submit-btn"
					class:submit-btn--loading={isSubmitting}
					type="submit"
					disabled={shortResponseText.trim().length === 0 || isSubmitting}
				>
					{#if isSubmitting}
						<span class="btn-spinner" aria-hidden="true"></span>
						Grading…
					{:else}
						Submit answer
					{/if}
				</button>
			</form>
		{/if}
	{/if}

	{#if submitError}
		<p class="error-msg" role="alert">{submitError}</p>
	{/if}
</article>

<style>
	.card {
		background: var(--paper-50);
		border: 1px solid var(--paper-300);
		border-radius: var(--radius-md);
		padding: 1.35rem 1.4rem;
		box-shadow: var(--shadow-sm);
		transition: border-color 0.18s ease;
	}

	.card.is-answered.is-correct {
		border-color: var(--good-200);
		background: color-mix(in srgb, var(--good-100) 40%, var(--paper-50));
	}

	.card.is-answered.is-incorrect {
		border-color: var(--bad-200);
		background: color-mix(in srgb, var(--bad-100) 30%, var(--paper-50));
	}

	/* ─── Header ─── */

	.card-header {
		display: flex;
		gap: 0.9rem;
		align-items: flex-start;
		margin-bottom: 1.15rem;
	}

	.q-index {
		flex-shrink: 0;
		width: 26px;
		height: 26px;
		border-radius: 50%;
		background: var(--paper-200);
		color: var(--ink-600);
		font-size: 0.78rem;
		font-weight: 700;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-top: 0.2rem;
		font-family: var(--font-sans);
		transition: background-color 0.18s, color 0.18s;
	}

	.is-answered .q-index {
		background: var(--accent-200);
		color: var(--accent-700);
	}

	.q-prompt {
		font-family: var(--font-serif);
		font-size: 1.05rem;
		line-height: 1.55;
		color: var(--ink-800);
	}

	/* ─── Choices ─── */

	ul.choices {
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.choice-label {
		display: flex;
		align-items: flex-start;
		gap: 0.65rem;
		padding: 0.6rem 0.9rem;
		border: 1px solid var(--paper-300);
		border-radius: var(--radius-sm);
		font-size: 0.93rem;
		line-height: 1.45;
		cursor: pointer;
		transition: border-color 0.14s, background 0.14s;
	}

	.choice-label:hover { border-color: var(--accent-300); background: var(--accent-100); }
	.choice-label--selected { border-color: var(--accent-500); background: var(--accent-100); }

	.choice-label input[type='radio'] {
		margin-top: 0.12rem;
		flex-shrink: 0;
		accent-color: var(--accent-600);
	}

	/* Result-mode choices */
	.choices--result .choice {
		display: flex;
		align-items: flex-start;
		gap: 0.65rem;
		padding: 0.6rem 0.9rem;
		border: 1px solid var(--paper-300);
		border-radius: var(--radius-sm);
		font-size: 0.93rem;
		color: var(--ink-600);
	}

	.choices--result .choice--correct {
		border-color: var(--good-500);
		background: var(--good-100);
		color: var(--good-700);
		font-weight: 500;
	}

	.choices--result .choice--wrong {
		border-color: var(--bad-400);
		background: var(--bad-100);
		color: var(--bad-700);
		text-decoration: line-through;
		opacity: 0.85;
	}

	.choice-glyph {
		flex-shrink: 0;
		width: 16px;
		font-size: 0.82rem;
		font-weight: 700;
		margin-top: 0.08rem;
	}

	/* ─── Textarea ─── */

	textarea {
		display: block;
		width: 100%;
		border: 1px solid var(--paper-300);
		border-radius: var(--radius-sm);
		padding: 0.8rem 1rem;
		font-family: var(--font-sans);
		font-size: 0.94rem;
		line-height: 1.6;
		color: var(--ink-800);
		background: var(--paper-100);
		resize: vertical;
		margin-bottom: 0.85rem;
		transition: border-color 0.14s, background 0.14s;
		caret-color: var(--accent-600);
	}

	textarea:focus {
		outline: none;
		border-color: var(--accent-400);
		background: var(--paper-50);
		box-shadow: 0 0 0 3px var(--accent-100);
	}

	textarea::placeholder { color: var(--ink-400); }
	textarea:disabled { opacity: 0.6; }

	/* ─── Submit button ─── */

	.submit-btn {
		appearance: none;
		border: none;
		background: var(--ink-900);
		color: var(--paper-50);
		font-size: 0.88rem;
		font-weight: 600;
		padding: 0.6rem 1.2rem;
		border-radius: var(--radius-sm);
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		transition: background-color 0.15s, transform 0.1s;
	}

	.submit-btn:hover:not(:disabled) { background: var(--accent-700); }
	.submit-btn:active:not(:disabled) { transform: scale(0.98); }

	.submit-btn:disabled {
		background: var(--paper-300);
		color: var(--ink-400);
		cursor: not-allowed;
	}

	.btn-spinner {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		border: 2px solid rgba(253, 251, 246, 0.35);
		border-top-color: var(--paper-50);
		animation: spin 0.7s linear infinite;
	}

	@keyframes spin { to { transform: rotate(360deg); } }

	/* ─── Submitted answer display ─── */

	.submitted-answer {
		background: var(--paper-100);
		border: 1px solid var(--paper-300);
		border-radius: var(--radius-sm);
		padding: 0.8rem 1rem;
		margin-bottom: 0.9rem;
	}

	.submitted-label {
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.07em;
		text-transform: uppercase;
		color: var(--ink-500);
		margin-bottom: 0.3rem;
	}

	.submitted-text {
		font-size: 0.93rem;
		color: var(--ink-700);
		line-height: 1.55;
	}

	/* ─── Verdict ─── */

	.verdict {
		font-size: 0.9rem;
		font-weight: 600;
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.verdict--correct { color: var(--good-700); }
	.verdict--incorrect { color: var(--bad-700); }

	.verdict-feedback {
		font-weight: 400;
		color: var(--ink-600);
		line-height: 1.5;
	}

	/* ─── Error ─── */

	.error-msg {
		margin-top: 0.8rem;
		font-size: 0.84rem;
		color: var(--bad-600);
	}
</style>
