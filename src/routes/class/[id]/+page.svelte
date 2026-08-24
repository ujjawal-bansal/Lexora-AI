<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import type { PageData } from './$types';
	import { GROUP_LABELS, categoryGroup } from '$lib/categories';

	let { data }: { data: PageData } = $props();
	let { classRow, aggregate } = $derived(data);

	type QueryEntry = { question: string; answer: string };

	let question = $state('');
	let isAsking = $state(false);
	let queryError = $state<string | null>(null);
	let queryHistory = $state<QueryEntry[]>([]);

	let maxCategoryCount = $derived(
		aggregate.categoryFrequency.length > 0 ? aggregate.categoryFrequency[0].count : 1
	);

	const SUGGESTED_QUESTIONS = [
		'What are the top 3 issues across the class?',
		'Which students need the most structural work?',
		'What grammar issues are most common?'
	];

	// We handle the action result imperatively here (no `form` prop, no $effect) so there is
	// zero chance of a reactive loop between the result and the history list it appends to.
	const handleAsk: SubmitFunction = () => {
		isAsking = true;
		queryError = null;
		const askedQuestion = question;

		return async ({ result }) => {
			isAsking = false;

			if (result.type === 'success' && result.data) {
				const answer = result.data.answer as string | undefined;
				if (answer) {
					queryHistory = [{ question: askedQuestion, answer }, ...queryHistory];
					question = '';
					return;
				}
			}

			if (result.type === 'failure') {
				queryError = (result.data?.message as string) ?? 'Something went wrong. Please try again.';
				return;
			}

			queryError = 'Something went wrong answering that question. Please try again.';
		};
	};

	function askSuggested(q: string) {
		question = q;
	}
</script>

<svelte:head>
	<title>{classRow.name ?? 'Class Dashboard'} — Lexora AI</title>
</svelte:head>

<main class="page">
	<a href="/class" class="back-link">← New class batch</a>

	<header class="masthead">
		<p class="eyebrow">Class analytics</p>
		<h1>{classRow.name ?? 'Class results'}</h1>
		<p class="subtitle">
			{aggregate.gradedSubmissions} of {aggregate.totalSubmissions} essays graded ·
			{aggregate.totalMistakes} mistakes found
		</p>
	</header>

	<!-- ─── Natural language query ─── -->
	<section class="query-section">
		<h2 class="section-title">Ask about this class</h2>
		<form method="POST" action="?/query" use:enhance={handleAsk} class="query-form">
			<input
				type="text"
				name="question"
				bind:value={question}
				placeholder="e.g. What grammar issues are most common?"
				disabled={isAsking}
				class="query-input"
			/>
			<button type="submit" class="query-submit" disabled={!question.trim() || isAsking}>
				{isAsking ? 'Thinking…' : 'Ask'}
			</button>
		</form>

		{#if queryHistory.length === 0}
			<div class="suggested-questions">
				{#each SUGGESTED_QUESTIONS as q (q)}
					<button type="button" class="suggested-chip" onclick={() => askSuggested(q)}>
						{q}
					</button>
				{/each}
			</div>
		{/if}

		{#if queryError}
			<p class="query-error" role="alert">{queryError}</p>
		{/if}

		{#if queryHistory.length > 0}
			<div class="query-history">
				{#each queryHistory as item, i (i)}
					<div class="query-answer-card">
						<p class="query-q">{item.question}</p>
						<p class="query-a">{item.answer}</p>
					</div>
				{/each}
			</div>
		{/if}
	</section>

	{#if aggregate.totalMistakes === 0}
		<section class="empty-state">
			<div class="empty-icon" aria-hidden="true">✓</div>
			<h2>No mistake patterns yet</h2>
			<p>Either grading is still in progress, or this class wrote cleanly across the board.</p>
		</section>
	{:else}
		<!-- ─── Category frequency ─── -->
		<section class="dashboard-section">
			<h2 class="section-title">Mistake frequency by category</h2>
			<div class="freq-list">
				{#each aggregate.categoryFrequency as cat (cat.category)}
					{@const widthPct = Math.max(8, (cat.count / maxCategoryCount) * 100)}
					{@const group = categoryGroup(cat.category)}
					<div class="freq-row">
						<div class="freq-label-row">
							<span class="freq-label">{cat.label}</span>
							<span class="freq-meta">
								{cat.count} occurrence{cat.count !== 1 ? 's' : ''} · {cat.studentCount} student{cat.studentCount !== 1
									? 's'
									: ''}
							</span>
						</div>
						<div class="freq-bar-track">
							<div class="freq-bar-fill {group}" style="width: {widthPct}%"></div>
						</div>
					</div>
				{/each}
			</div>
		</section>

		<!-- ─── Top excerpts ─── -->
		{#if aggregate.topExcerpts.length > 0}
			<section class="dashboard-section">
				<h2 class="section-title">Most common patterns</h2>
				<div class="excerpt-list">
					{#each aggregate.topExcerpts as excerpt, i (i)}
						<article class="excerpt-card">
							<div class="excerpt-header">
								<span class="excerpt-category">{GROUP_LABELS[categoryGroup(excerpt.category)]}</span>
								{#if excerpt.occurrences > 1}
									<span class="excerpt-count">{excerpt.occurrences}&times; seen</span>
								{/if}
							</div>
							<p class="excerpt-quote">&ldquo;{excerpt.quote}&rdquo;</p>
							<p class="excerpt-explanation">{excerpt.explanation}</p>
						</article>
					{/each}
				</div>
			</section>
		{/if}

		<!-- ─── Per-student summary ─── -->
		<section class="dashboard-section">
			<h2 class="section-title">By student</h2>
			<div class="student-list">
				{#each aggregate.students as student (student.submissionId)}
					<a href="/submissions/{student.submissionId}" class="student-row">
						<span class="student-label">{student.label}</span>
						<span class="student-status status-{student.status}">{student.status}</span>
						<span class="student-count">{student.mistakeCount} mistake{student.mistakeCount !== 1 ? 's' : ''}</span>
					</a>
				{/each}
			</div>
		</section>
	{/if}
</main>

<style>
	.page {
		flex: 1;
		width: 100%;
		max-width: 820px;
		margin: 0 auto;
		padding: clamp(2rem, 5vw, 3.5rem) 1.5rem 5rem;
		display: flex;
		flex-direction: column;
		gap: 2.25rem;
	}

	.back-link {
		display: inline-flex;
		text-decoration: none;
		font-size: 0.85rem;
		color: var(--ink-500);
		align-self: flex-start;
		margin-bottom: -1rem;
		transition: color 0.14s ease;
	}
	.back-link:hover { color: var(--accent-600); }

	.masthead {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.eyebrow {
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--accent-600);
	}

	h1 { font-size: clamp(1.85rem, 4.5vw, 2.5rem); }

	.subtitle {
		font-size: 0.92rem;
		color: var(--ink-500);
	}

	.section-title {
		font-family: var(--font-sans);
		font-size: 0.78rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--ink-600);
		margin-bottom: 1rem;
	}

	/* ─── Query section ─── */

	.query-section {
		background: var(--paper-50);
		border: 1.5px solid var(--accent-200);
		border-radius: var(--radius-lg);
		padding: 1.5rem;
		box-shadow: var(--shadow-sm);
	}

	.query-form {
		display: flex;
		gap: 0.6rem;
	}

	.query-input {
		flex: 1;
		border: 1.5px solid var(--paper-300);
		border-radius: var(--radius-md);
		padding: 0.7rem 1rem;
		font-size: 0.95rem;
		font-family: var(--font-sans);
		background: var(--paper-100);
		color: var(--ink-800);
		transition: border-color 0.15s;
	}

	.query-input:focus {
		outline: none;
		border-color: var(--accent-400);
		background: var(--paper-50);
		box-shadow: 0 0 0 3px var(--accent-100);
	}

	.query-submit {
		appearance: none;
		border: none;
		background: var(--ink-900);
		color: var(--paper-50);
		font-weight: 600;
		font-size: 0.9rem;
		padding: 0 1.4rem;
		border-radius: var(--radius-md);
		cursor: pointer;
		white-space: nowrap;
		transition: background-color 0.15s;
	}

	.query-submit:hover:not(:disabled) { background: var(--accent-700); }
	.query-submit:disabled {
		background: var(--paper-300);
		color: var(--ink-400);
		cursor: not-allowed;
	}

	.suggested-questions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-top: 0.9rem;
	}

	.suggested-chip {
		appearance: none;
		border: 1px solid var(--paper-300);
		background: var(--paper-100);
		color: var(--ink-600);
		font-size: 0.82rem;
		padding: 0.45rem 0.85rem;
		border-radius: 99px;
		cursor: pointer;
		transition: border-color 0.14s, color 0.14s, background 0.14s;
	}

	.suggested-chip:hover {
		border-color: var(--accent-400);
		color: var(--accent-700);
		background: var(--accent-100);
	}

	.query-error {
		margin-top: 0.85rem;
		font-size: 0.85rem;
		color: var(--bad-600);
	}

	.query-history {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-top: 1.1rem;
	}

	.query-answer-card {
		background: var(--paper-100);
		border-radius: var(--radius-md);
		padding: 0.9rem 1.1rem;
	}

	.query-q {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--ink-700);
		margin-bottom: 0.4rem;
	}

	.query-q::before {
		content: '"';
	}
	.query-q::after {
		content: '"';
	}

	.query-a {
		font-family: var(--font-serif);
		font-size: 1rem;
		line-height: 1.6;
		color: var(--ink-800);
	}

	/* ─── Frequency bars ─── */

	.freq-list {
		display: flex;
		flex-direction: column;
		gap: 0.95rem;
	}

	.freq-row {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.freq-label-row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.freq-label {
		font-size: 0.92rem;
		font-weight: 600;
		color: var(--ink-800);
	}

	.freq-meta {
		font-size: 0.78rem;
		color: var(--ink-500);
		white-space: nowrap;
		font-variant-numeric: tabular-nums;
	}

	.freq-bar-track {
		height: 8px;
		background: var(--paper-200);
		border-radius: 99px;
		overflow: hidden;
	}

	.freq-bar-fill {
		height: 100%;
		border-radius: 99px;
		transition: width 0.5s cubic-bezier(0.25, 1, 0.5, 1);
	}

	.freq-bar-fill.grammar { background: linear-gradient(90deg, var(--accent-400), var(--accent-600)); }
	.freq-bar-fill.structure { background: linear-gradient(90deg, var(--ink-500), var(--ink-700)); }

	/* ─── Excerpts ─── */

	.excerpt-list {
		display: flex;
		flex-direction: column;
		gap: 0.7rem;
	}

	.excerpt-card {
		background: var(--paper-50);
		border: 1px solid var(--paper-300);
		border-left: 3px solid var(--accent-400);
		border-radius: 0 var(--radius-md) var(--radius-md) 0;
		padding: 0.9rem 1.1rem;
		box-shadow: var(--shadow-sm);
	}

	.excerpt-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}

	.excerpt-category {
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--accent-600);
	}

	.excerpt-count {
		font-size: 0.76rem;
		color: var(--ink-500);
		background: var(--paper-200);
		padding: 0.1em 0.55em;
		border-radius: 99px;
	}

	.excerpt-quote {
		font-family: var(--font-serif);
		font-style: italic;
		font-size: 0.98rem;
		color: var(--ink-800);
		margin-bottom: 0.35rem;
		line-height: 1.5;
	}

	.excerpt-explanation {
		font-size: 0.86rem;
		color: var(--ink-600);
		line-height: 1.5;
	}

	/* ─── Students ─── */

	.student-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.student-row {
		display: flex;
		align-items: center;
		gap: 0.85rem;
		text-decoration: none;
		background: var(--paper-50);
		border: 1px solid var(--paper-300);
		border-radius: var(--radius-md);
		padding: 0.75rem 1rem;
		transition: border-color 0.14s, box-shadow 0.14s;
	}

	.student-row:hover {
		border-color: var(--accent-400);
		box-shadow: var(--shadow-sm);
	}

	.student-label {
		font-weight: 600;
		color: var(--ink-800);
		font-size: 0.92rem;
	}

	.student-status {
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		padding: 0.15em 0.55em;
		border-radius: 99px;
	}

	.status-graded { background: var(--good-100); color: var(--good-700); }
	.status-pending { background: var(--paper-200); color: var(--ink-500); }
	.status-failed { background: var(--bad-100); color: var(--bad-700); }

	.student-count {
		margin-left: auto;
		font-size: 0.85rem;
		color: var(--ink-500);
	}

	/* ─── Empty state ─── */

	.empty-state {
		text-align: center;
		padding: 3.5rem 2rem;
		background: var(--good-100);
		border: 1px solid var(--good-200);
		border-radius: var(--radius-lg);
	}

	.empty-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 48px;
		height: 48px;
		border-radius: 50%;
		background: var(--good-500);
		color: white;
		font-size: 1.4rem;
		margin-bottom: 1rem;
	}

	.empty-state h2 { font-size: 1.3rem; margin-bottom: 0.4rem; }
	.empty-state p { color: var(--good-700); font-size: 0.92rem; }

	@media (max-width: 540px) {
		.query-form {
			flex-direction: column;
		}
	}
</style>
