/**
 * Stops the page behind a full-screen layer from scrolling, without moving it.
 *
 * The first version pinned <body> (`position: fixed` with a negative `top`) and put back
 * whatever inline style it had read when the layer opened. Opening a second photo before the
 * first close had finished read the pinned style as "the previous one" and restored that: the
 * page stayed frozen and the next photos could not be tapped. Hiding the root's overflow keeps
 * the scroll position by itself, so there is no position to restore, and the counter means two
 * overlapping layers can never leave the page locked.
 */
let locks = 0;
let previousOverflow = "";

export function lockPageScroll(
  root: HTMLElement = document.documentElement,
): () => void {
  if (locks === 0) {
    previousOverflow = root.style.overflow;
    root.style.overflow = "hidden";
  }
  locks += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    locks -= 1;
    if (locks === 0) root.style.overflow = previousOverflow;
  };
}
