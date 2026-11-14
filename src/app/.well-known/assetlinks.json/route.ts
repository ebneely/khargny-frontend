// Android App Links: 5argny.com links open the installed app (app.json android.intentFilters, autoVerify).
// shortcut: lists only the upload key's SHA-256 (the EAS and local builds' signature). Builds installed from Google Play
// are re-signed with the Play App Signing key; add that fingerprint (Play Console > App integrity) or Play installs won't verify.
const SHA256 = ['1D:75:3B:AF:4A:98:49:89:8C:EA:C2:9B:5B:5F:BC:B6:56:C8:E2:C9:56:21:75:05:3B:D5:46:5B:38:52:97:83'];

export const dynamic = 'force-static';

export function GET() {
  return Response.json([{
    relation: ['delegate_permission/common.handle_all_urls'],
    target: { namespace: 'android_app', package_name: 'com.khargny.app', sha256_cert_fingerprints: SHA256 },
  }]);
}
