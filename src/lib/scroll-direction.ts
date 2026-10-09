export type ScrollDirection = { hidden: boolean; anchor: number };

export function initialScrollDirection(top: number): ScrollDirection {
  return { hidden: false, anchor: Math.max(0, top) };
}

export function scrollDirection(
  previous: ScrollDirection,
  top: number,
  { locked = false, scrollable = true }: { locked?: boolean; scrollable?: boolean } = {},
): ScrollDirection {
  const position = Math.max(0, top);
  if (position <= 96 || locked || !scrollable) return initialScrollDirection(position);
  const travel = position - previous.anchor;
  if ((!previous.hidden && travel > 8) || (previous.hidden && travel < -8)) {
    return { hidden: !previous.hidden, anchor: position };
  }
  return {
    hidden: previous.hidden,
    anchor: previous.hidden ? Math.max(previous.anchor, position) : Math.min(previous.anchor, position),
  };
}
