type DeploymentEnvironment = {
  VERCEL_ENV?: string;
  NEXT_PUBLIC_ENV?: string;
  NODE_ENV?: string;
};

// Named, not "anything that is not production": a typo in a host variable must never take
// the production site out of search results. An unknown value falls through to NODE_ENV.
const PREVIEW_NAMES = new Set(['preview', 'pre', 'staging', 'development', 'dev', 'test']);

export function isPreviewDeployment(env: DeploymentEnvironment = {
  VERCEL_ENV: process.env.VERCEL_ENV,
  NEXT_PUBLIC_ENV: process.env.NEXT_PUBLIC_ENV,
  NODE_ENV: process.env.NODE_ENV,
}): boolean {
  if (env.VERCEL_ENV === 'production') return false;
  if (env.VERCEL_ENV && PREVIEW_NAMES.has(env.VERCEL_ENV)) return true;
  if (env.NEXT_PUBLIC_ENV === 'production') return false;
  if (env.NEXT_PUBLIC_ENV && PREVIEW_NAMES.has(env.NEXT_PUBLIC_ENV)) return true;
  return env.NODE_ENV !== 'production';
}
