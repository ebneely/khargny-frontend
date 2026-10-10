export const PHOTO_TAP_DELAY = 280;
export type TapPoint = { x: number; y: number };

export function createPhotoTap(single: () => void, double: (point: TapPoint) => void) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let first: TapPoint | undefined;
  const cancel = () => { if (timer) clearTimeout(timer); timer = undefined; first = undefined; };
  return {
    cancel,
    tap(point: TapPoint) {
      if (timer && first && Math.hypot(point.x - first.x, point.y - first.y) < 40) {
        cancel(); double(point); return;
      }
      cancel(); first = point;
      timer = setTimeout(() => { cancel(); single(); }, PHOTO_TAP_DELAY);
    },
  };
}

export function likeMotion(reduced: boolean, before: boolean, after: boolean, visitor: boolean) {
  return reduced || !visitor || before === after ? '' : after ? 'celebrate' : 'empty';
}

export function socialProofKey(count: number) {
  return count === 0 ? 'place.firstLike' : count >= 3 ? 'place.likeProof' : null;
}
