import { describe, expect, it } from 'vitest';
import { proofProblem, proofCode, proofRetryable } from './proof';

const MB = 1024 * 1024;
describe('proofProblem', () => {
  it('lets photos up to 8 MB and videos up to 30 MB / 30 s through', () => {
    expect(proofProblem({ type: 'image/jpeg', name: 'a.jpg', size: 8 * MB })).toBeNull();
    expect(proofProblem({ type: 'image/heic', name: 'a.heic', size: MB })).toBeNull();
    expect(proofProblem({ type: 'video/mp4', name: 'v.mp4', size: 30 * MB }, 30)).toBeNull();
    expect(proofProblem({ type: '', name: 'v.MOV', size: MB }, 12)).toBeNull();
  });
  it('names the reason', () => {
    expect(proofProblem({ type: 'image/png', name: 'a.png', size: 0 })).toBe('missing');
    expect(proofProblem({ type: 'application/pdf', name: 'a.pdf', size: MB })).toBe('type');
    expect(proofProblem({ type: 'video/webm', name: 'a.webm', size: MB })).toBe('type');
    expect(proofProblem({ type: 'image/png', name: 'a.png', size: 8 * MB + 1 })).toBe('too_large');
    expect(proofProblem({ type: 'video/mp4', name: 'v.mp4', size: 30 * MB + 1 }, 10)).toBe('too_large');
    expect(proofProblem({ type: 'video/quicktime', name: 'v.mov', size: MB }, 31)).toBe('too_long');
  });
});
describe('proofCode', () => {
  it('maps server codes to copy keys, unknown to failed', () => {
    expect(proofCode('media.too_large')).toBe('too_large');
    expect(proofCode('media.storage')).toBe('storage');
    expect(proofCode('UNKNOWN_ERROR')).toBe('failed');
    expect(proofCode(undefined)).toBe('failed');
    expect(proofRetryable('storage') && proofRetryable('failed') && !proofRetryable('too_large')).toBe(true);
  });
});
