// iOS universal links: 5argny.com links open the installed app (app.json ios.associatedDomains). Served as JSON with no
// extension and no redirect, as Apple requires. App ID = Apple Team ID (from the App Store build's provisioning profile)
// + ios.bundleIdentifier. The paths mirror the app's Android intent filters: English plain, Arabic under /ar.
const PATHS = ['/explorer/*', '/c/*', '/plan*', '/saved*', '/marketplace*', '/host/*'];

export const dynamic = 'force-static';

export function GET() {
  return Response.json({
    applinks: {
      details: [{
        appIDs: ['9Q64BHDDYU.com.khargny.app'],
        components: [...PATHS, ...PATHS.map((p) => `/ar${p}`)].map((path) => ({ '/': path })),
      }],
    },
  });
}
