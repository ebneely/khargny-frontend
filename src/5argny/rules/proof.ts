// Proof media on a correction or a report (contracts/api.md "Proof media"): checked on the device before any upload,
// with the same limits and the same codes the server answers (media.type, media.too_large, media.too_long).
export const PROOF_MAX = 4;
const MB = 1024 * 1024;
export type ProofProblem = 'missing' | 'type' | 'too_large' | 'too_long';

/** null when the file can go up; else the reason. `seconds` is a video's duration (read from its metadata). */
export function proofProblem(f: { type: string; name: string; size: number }, seconds?: number): ProofProblem | null {
  if (!f.size) return 'missing';
  const ext = f.name.toLowerCase().split('.').pop() ?? '';
  const video = f.type === 'video/mp4' || f.type === 'video/quicktime' || (!f.type && (ext === 'mp4' || ext === 'mov'));
  const image = /^image\/(jpeg|png|webp|heic|heif)$/.test(f.type) || (!f.type && ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'].includes(ext));
  if (!video && !image) return 'type';
  if (f.size > (video ? 30 : 8) * MB) return 'too_large';
  if (video && seconds != null && seconds > 30.5) return 'too_long';
  return null;
}
/** The server's error code (media.too_large) as the copy key (too_large); anything unknown is a failed upload. */
export const proofCode = (code: string | undefined) => {
  const k = (code ?? '').replace(/^media\./, '');
  return ['missing', 'type', 'decode', 'heic', 'too_large', 'too_long', 'rate', 'storage'].includes(k) ? k : 'failed';
};
/** Worth a retry: the file itself is fine, the moment was not. */
export const proofRetryable = (k: string) => k === 'storage' || k === 'rate' || k === 'failed';
