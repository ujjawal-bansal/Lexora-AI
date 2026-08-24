import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';
import type { Database } from '$lib/types/db';

function requireEnv(name: string): string {
	const value = env[name];
	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`);
	}
	return value;
}

export function createSupabaseServerClient() {
	const url = requireEnv('SUPABASE_URL');
	const key = env.SUPABASE_SERVICE_ROLE_KEY ?? requireEnv('SUPABASE_ANON_KEY');

	return createClient<Database>(url, key, {
		auth: { persistSession: false }
	});
}
