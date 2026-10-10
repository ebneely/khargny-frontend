import { MOTION_EASING } from "./motion";

export function animateWater(
  element: SVGElement,
  target: number,
  duration: number,
  delay: number,
  previous?: Animation,
  reduced = false,
) {
  const start =
    previous && previous.playState !== "finished"
      ? window.getComputedStyle(element).transform
      : element.style.transform;
  previous?.cancel();
  const end = `translateY(${target}px)`;
  element.style.transform = end;
  if (reduced || typeof element.animate !== "function") return;
  const animation = element.animate(
    [{ transform: start || end }, { transform: end }],
    { duration, delay, easing: MOTION_EASING.water, fill: "both" },
  );
  return animation;
}
