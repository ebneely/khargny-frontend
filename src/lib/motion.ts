const timing = {
  lift: 90,
  drop: 170,
  landingAt: 170,
  fill: 320,
  ripple: 380,
  drain: 180,
  photoRest: 120,
  flight: 360,
  save: 220,
  share: 120,
  live: 140,
};

export const MOTION = {
  ...timing,
  land: timing.lift + timing.drop - timing.landingAt,
  buttonTotal: timing.landingAt + timing.ripple,
  photoDrop: timing.lift + timing.drop,
  photoTotal: timing.lift + timing.drop + timing.photoRest + timing.flight,
  roll: timing.save,
};

export const MOTION_EASING = {
  lift: "cubic-bezier(.2,.7,.3,1)",
  drop: "cubic-bezier(.4,0,.8,.5)",
  settle: "cubic-bezier(.2,.8,.3,1)",
  water: "cubic-bezier(.2,.6,.4,1)",
  flight: "cubic-bezier(.55,0,1,1)",
};

export function motionProperties(): Record<string, string> {
  const properties: Record<string, string> = {};
  for (const [name, value] of Object.entries(MOTION))
    properties[
      `--motion-${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`
    ] = `${value}ms`;
  for (const [name, value] of Object.entries(MOTION_EASING))
    properties[`--motion-ease-${name}`] = value;
  return properties;
}
