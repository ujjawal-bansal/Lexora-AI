import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
	// This app sits beside another lockfile in the parent folder; pin the root so Next
	// does not infer the wrong one when tracing files.
	outputFileTracingRoot: path.join(__dirname),
	// The AI pipeline runs two sequential Groq calls; give route handlers room to finish.
	serverExternalPackages: ['groq-sdk']
};

export default nextConfig;
