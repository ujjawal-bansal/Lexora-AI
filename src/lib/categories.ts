import { GRAMMAR_CATEGORIES, type MistakeCategory } from '$lib/types/db';

export const CATEGORY_LABELS: Record<MistakeCategory, string> = {
	subject_verb_agreement: 'Subject-verb agreement',
	comma_splice: 'Comma splice',
	run_on_sentence: 'Run-on sentence',
	tense_consistency: 'Tense consistency',
	thesis_clarity: 'Thesis clarity',
	weak_evidence: 'Weak evidence',
	paragraph_structure: 'Paragraph structure',
	logical_flow: 'Logical flow'
};

export type CategoryGroup = 'grammar' | 'structure';

export function categoryGroup(category: MistakeCategory): CategoryGroup {
	return (GRAMMAR_CATEGORIES as readonly string[]).includes(category) ? 'grammar' : 'structure';
}

export const GROUP_LABELS: Record<CategoryGroup, string> = {
	grammar: 'Grammar & mechanics',
	structure: 'Structure & argument'
};
