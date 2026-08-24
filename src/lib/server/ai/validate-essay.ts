const MIN_WORD_COUNT = 50;
const MAX_WORD_COUNT = 5000;

export type EssayValidationResult = { ok: true } | { ok: false; message: string };

function countWords(text: string): number {
	return text.trim().split(/\s+/).filter(Boolean).length;
}

export function validateEssayText(text: string): EssayValidationResult {
	const trimmed = text.trim();
	if (trimmed.length === 0) {
		return { ok: false, message: 'Please paste an essay before submitting.' };
	}

	const wordCount = countWords(trimmed);
	if (wordCount < MIN_WORD_COUNT) {
		return {
			ok: false,
			message: `Essay is too short (${wordCount} words). Please paste at least ${MIN_WORD_COUNT} words.`
		};
	}
	if (wordCount > MAX_WORD_COUNT) {
		return {
			ok: false,
			message: `Essay is too long (${wordCount} words). Please paste at most ${MAX_WORD_COUNT} words.`
		};
	}

	return { ok: true };
}
