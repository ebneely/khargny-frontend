// Android App Links: 5argny.com links open the installed app (app.json android.intentFilters, autoVerify).
// shortcut: lists only the upload key's SHA-256 (the EAS and local builds' signature). Builds installed from Google Play
// are re-signed with the Play App Signing key; add that fingerprint (Play Console > App integrity) or Play installs won't verify.
// Play app signing key (installs from Google Play) first, then the upload key (side-loaded builds)
const SHA256 = ['87:1C:65:AE:7D:98:A1:07:D1:63:46:8C:9E:D8:33:A2:4B:5B:E6:4B:06:AD:E9:75:72:6E:4A:D4:BE:48:3C:95', '1D:75:3B:AF:4A:98:49:89:8C:EA:C2:9B:5B:5F:BC:B6:56:C8:E2:C9:56:21:75:05:3B:D5:46:5B:38:52:97:83'];

export const dynamic = 'force-static';

export function GET() {
  return Response.json([{
    relation: ['delegate_permission/common.handle_all_urls'],
    target: { namespace: 'android_app', package_name: 'com.khargny.app', sha256_cert_fingerprints: SHA256 },
  }]);
}
