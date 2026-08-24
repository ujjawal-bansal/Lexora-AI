<script lang="ts">
	import type { PageData } from './$types';
	import type { MistakeCategory, PracticeQuestion } from '$lib/types/db';
	import { CATEGORY_LABELS, GROUP_LABELS, categoryGroup } from '$lib/categories';
	import PracticeQuestionCard from '$lib/components/PracticeQuestionCard.svelte';

	let { data }: { data: PageData } = $props();
	let { submission, questions, mistakeCount, answers } = $derived(data);

	type Group = { category: MistakeCategory; items: PracticeQuestion[] };

	function buildGroups(items: PracticeQuestion[], group: 'grammar' | 'structure'): Group[] {
		const byCategory = new Map<MistakeCategory, PracticeQuestion[]>();
		for (const q of items) {
			if (categoryGroup(q.category) !== group) continue;
			const existing = byCategory.get(q.category);
			if (existing) existing.push(q);
			else byCategory.set(q.category, [q]);
		}
		return Array.from(byCategory.entries()).map(([cat, its]) => ({ category: cat, items: its }));
	}

	let grammarGroups = $derived(buildGroups(questions, 'grammar'));
	let structureGroups = $derived(buildGroups(questions, 'structure'));

	let questionIndex = $derived.by(() => {
		const indexById = new Map<string, number>();
		let n = 0;
		for (const group of [...grammarGroups, ...structureGroups]) {
			for (const q of group.items) {
				n += 1;
				indexById.set(q.id, n);
			}
		}
		return indexById;
	});
</script>

<svelte:head>
	<title>Practice — Lexora AI</title>
</svelte:head>

<main class="page">
	<a href="/submissions/{submission.id}" class="back-link">← Back to results</a>

	<header class="masthead">
		<p class="eyebrow">Targeted practice</p>
		<h1>Practice what you missed</h1>
		{#if questions.length > 0}
			<p class="subtitle">
				{questions.length} question{questions.length !== 1 ? 's' : ''} across
				{grammarGroups.length + structureGroups.length}
				{grammarGroups.length + structureGroups.length !== 1 ? 'categories' : 'category'}
			</p>
		{/if}
	</header>

	{#if questions.length === 0}
		<section class="empty-state">
			<div class="empty-icon" aria-hidden="true">★</div>
			<h2>Nothing to practice</h2>
			<p>
				{mistakeCount === 0
					? 'No mistakes were found in your essay, so there\'s nothing to practice.'
					: "Practice questions couldn't be generated for this submission."}
			</p>
			<a href="/" class="empty-cta">Submit another essay</a>
		</section>
	{:else}
		{#if grammarGroups.length > 0}
			<section class="group-section">
				<header class="group-header">
					<span class="group-dot grammar" aria-hidden="true"></span>
					<h2 class="group-label">{GROUP_LABELS.grammar}</h2>
				</header>

				{#each grammarGroups as group (group.category)}
					<div class="category-block">
						<h3 class="category-name">{CATEGORY_LABELS[group.category]}</h3>
						<div class="question-stack">
							{#each group.items as question (question.id)}
								<PracticeQuestionCard
									{question}
									index={questionIndex.get(question.id) ?? 0}
									existingAnswer={answers[question.id]}
								/>
							{/each}
						</div>
					</div>
				{/each}
			</section>
		{/if}

		{#if grammarGroups.length > 0 && structureGroups.length > 0}
			<hr class="section-divider" />
		{/if}

		{#if structureGroups.length > 0}
			<section class="group-section">
				<header class="group-header">
					<span class="group-dot structure" aria-hidden="true"></span>
					<h2 class="group-label">{GROUP_LABELS.structure}</h2>
				</header>

				{#each structureGroups as group (group.category)}
					<div class="category-block">
						<h3 class="category-name">{CATEGORY_LABELS[group.category]}</h3>
						<div class="question-stack">
							{#each group.items as question (question.id)}
								<PracticeQuestionCard
									{question}
									index={questionIndex.get(question.id) ?? 0}
									existingAnswer={answers[question.id]}
								/>
							{/each}
						</div>
					</div>
				{/each}
			</section>
		{/if}
	{/if}
</main>

<style>
	.page {
		flex: 1;
		width: 100%;
		max-width: var(--max-width);
		margin: 0 auto;
		padding: clamp(2rem, 5vw, 3.5rem) 1.5rem 5rem;
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		text-decoration: none;
		font-size: 0.85rem;
		color: var(--ink-500);
		transition: color 0.14s ease;
		align-self: flex-start;
		margin-bottom: -0.5rem;
	}

	.back-link:hover { color: var(--accent-600); }

	.masthead {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.eyebrow {
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--accent-600);
	}

	h1 {
		font-size: clamp(1.85rem, 4.5vw, 2.5rem);
	}

	.subtitle {
		font-size: 0.9rem;
		color: var(--ink-500);
	}

	.section-divider {
		border: none;
		border-top: 1.5px dashed var(--paper-300);
		margin: 0;
	}

	.group-section {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.group-header {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}

	.group-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.group-dot.grammar { background: var(--accent-500); }
	.group-dot.structure { background: var(--ink-500); }

	.group-label {
		font-family: var(--font-sans);
		font-size: 0.78rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		margin: 0;
	}

	.category-block {
		display: flex;
		flex-direction: column;
		gap: 0.8rem;
	}

	.category-name {
		font-size: 0.92rem;
		font-weight: 600;
		color: var(--ink-700);
		font-family: var(--font-sans);
		margin: 0;
	}

	.question-stack {
		display: flex;
		flex-direction: column;
		gap: 0.7rem;
	}

	/* ─── Empty state ─── */

	.empty-state {
		text-align: center;
		padding: 3.5rem 2rem;
		background: var(--paper-50);
		border: 1px solid var(--paper-300);
		border-radius: var(--radius-lg);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.6rem;
	}

	.empty-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 52px;
		height: 52px;
		border-radius: 50%;
		background: var(--accent-200);
		color: var(--accent-700);
		font-size: 1.3rem;
		margin-bottom: 0.5rem;
	}

	.empty-state h2 {
		font-size: 1.4rem;
	}

	.empty-state p {
		color: var(--ink-600);
		max-width: 40ch;
		font-size: 0.95rem;
	}

	.empty-cta {
		display: inline-block;
		text-decoration: none;
		background: var(--ink-900);
		color: var(--paper-50);
		padding: 0.65rem 1.4rem;
		border-radius: var(--radius-md);
		font-weight: 600;
		font-size: 0.9rem;
		margin-top: 0.5rem;
		transition: background-color 0.15s;
	}

	.empty-cta:hover { background: var(--accent-700); }
</style>
