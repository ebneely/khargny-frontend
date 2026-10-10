import type { SVGProps } from 'react';

export const LIKE_HEART_PATH = 'M20.8 4.6a5.6 5.6 0 0 0-7.9 0L12 5.5l-.9-.9a5.6 5.6 0 0 0-7.9 7.9L12 21l8.8-8.5a5.6 5.6 0 0 0 0-7.9Z';

export function LikeIcon({ filled = false, size = 24, ...props }: SVGProps<SVGSVGElement> & { filled?: boolean; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={LIKE_HEART_PATH} /></svg>;
}
