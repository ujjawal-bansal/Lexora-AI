import Groq from 'groq-sdk';
import type { z } from 'zod';
import { env } from '$env/dynamic/private';

const GROQ_TIMEOUT_MS = 60_000;
const DEFAULT_GROQ_MODEL = 'openai/gpt-oss-20b';

function requireEnv(name: string): string {
	const value = env[name];
	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`);
	}
	return value;
}

let client: Groq | null = null;

function getClient(): Groq {
	if (!client) {
		client = new Groq({ apiKey: requireEnv('GROQ_API_KEY'), timeout: GROQ_TIMEOUT_MS });
	}
	return client;
}

function getModel(): string {
	return env.GROQ_MODEL?.trim() || DEFAULT_GROQ_MODEL;
}

type GroqErrorShape = {
	status?: number;
	name?: string;
	message?: string;
	error?: { code?: string; message?: string };
};

function asGroqError(err: unknown): GroqErrorShape {
	return err as GroqErrorShape;
}

function isModelNotFoundError(err: unknown): boolean {
	const e = asGroqError(err);
	const text = `${e.message ?? ''} ${e.error?.message ?? ''} ${e.error?.code ?? ''}`.toLowerCase();
	return e.status === 404 && (text.includes('model_not_found') || text.includes('does not exist'));
}

function isTimeoutError(err: unknown): boolean {
	const e = asGroqError(err);
	return e.name === 'APIConnectionTimeoutError' || `${e.message ?? ''}`.toLowerCase().includes('timed out');
}

export type PipelineStage = 'stage1' | 'stage2' | 'stage3' | 'stage4';

export class PipelineStageError extends Error {
	constructor(
		message: string,
		public readonly stage: PipelineStage,
		public readonly cause?: unknown
	) {
		super(message);
		this.name = 'PipelineStageError';
	}
}

/**
 * Calls Groq with JSON-object mode, parses the response as JSON, and validates it against
 * the given Zod schema. Any failure (timeout, malformed JSON, schema mismatch) is normalized
 * into a PipelineStageError rather than thrown raw, so callers can handle pipeline failures
 * uniformly instead of crashing the request.
 */
export async function callGroqForJson<Schema extends z.ZodTypeAny>(args: {
	stage: PipelineStage;
	systemPrompt: string;
	userPrompt: string;
	schema: Schema;
}): Promise<z.infer<Schema>> {
	const { stage, systemPrompt, userPrompt, schema } = args;
	const primaryModel = getModel();

	const requestCompletion = async (model: string) =>
		getClient().chat.completions.create({
			model,
			messages: [
				{ role: 'system', content: systemPrompt },
				{ role: 'user', content: userPrompt }
			],
			response_format: { type: 'json_object' },
			temperature: 0.3
		});

	let rawContent: string | null;
	try {
		let completion;
		try {
			completion = await requestCompletion(primaryModel);
		} catch (err) {
			if (isModelNotFoundError(err) && primaryModel !== DEFAULT_GROQ_MODEL) {
				console.warn(
					`[${stage}] configured GROQ_MODEL "${primaryModel}" is unavailable; retrying with ${DEFAULT_GROQ_MODEL}`
				);
				completion = await requestCompletion(DEFAULT_GROQ_MODEL);
			} else {
				throw err;
			}
		}
		rawContent = completion.choices[0]?.message?.content ?? null;
	} catch (err) {
		if (isModelNotFoundError(err)) {
			throw new PipelineStageError('Configured AI model is unavailable.', stage, err);
		}
		if (isTimeoutError(err)) {
			throw new PipelineStageError('AI request timed out.', stage, err);
		}
		throw new PipelineStageError(`Groq request failed (${stage})`, stage, err);
	}

	if (!rawContent) {
		throw new PipelineStageError(`Groq returned an empty response (${stage})`, stage);
	}

	let parsedJson: unknown;
	try {
		parsedJson = JSON.parse(rawContent);
	} catch (err) {
		console.error(`[${stage}] failed to parse Groq response as JSON:`, rawContent);
		throw new PipelineStageError(`Groq returned malformed JSON (${stage})`, stage, err);
	}

	const result = schema.safeParse(parsedJson);
	if (!result.success) {
		console.error(`[${stage}] Groq response failed schema validation:`, rawContent, result.error);
		throw new PipelineStageError(`Groq response did not match expected schema (${stage})`, stage, result.error);
	}

	return result.data;
}
