import 'server-only';
import { createClient } from '@supabase/supabase-js';

import type { Database } from '@/lib/types/db';

function requireEnv(name: string): string {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`);
	}
	return value;
}

export function createSupabaseServerClient() {
	const url = requireEnv('SUPABASE_URL');
	const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? requireEnv('SUPABASE_ANON_KEY');

	return createClient<Database>(url, key, {
		auth: { persistSession: false }
	});
}
