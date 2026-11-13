// Fonts and the type scale web.css uses. Sizes in px; `phone` = (max-width:1023px), `desktop` = (min-width:1024px).
export const fonts = {
  text: "system-ui,-apple-system,'SF Pro Text','Segoe UI','IBM Plex Sans Arabic',sans-serif", // --text
  display: "'Cairo','IBM Plex Sans Arabic',system-ui,sans-serif", // --display
};

export const type = {
  display: { size: 28, phone: 23, desktop: 34, weight: 900, lineHeight: 1.1, tracking: -0.025, font: 'display' }, // .t-display
  title: { size: 20, phone: 17, weight: 800, lineHeight: 1.2, tracking: -0.015, font: 'display' }, // .t-title
  head: { size: 15, phone: 14, weight: 700, lineHeight: 1.3, tracking: -0.005, font: 'text' }, // .t-head
  body: { size: 14, weight: 400, lineHeight: 1.45, font: 'text' }, // body
  small: { size: 12.5, phone: 12, tracking: 0.01, font: 'text' }, // .t-small, colour ink2
  micro: { size: 11.5, weight: 600, tracking: 0.02, font: 'text' }, // .t-micro, colour ink3
  wordmark: { size: 22, phone: 18, weight: 900, lineHeight: 1, tracking: -0.01, font: 'display' },
  bigNumber: { size: 24, weight: 900, lineHeight: 1, font: 'display' }, // On 5argny views, owner KPIs
  phoneNumber: { size: 26, weight: 900, lineHeight: 1.2, font: 'display' }, // the Call sheet
} as const;

// every font-weight in web.css, for fonts that need each loaded
export const weights = [400, 550, 600, 650, 700, 750, 800, 850, 900] as const;

// every other font-size web.css sets on components, smallest first
export const sizes = [9, 10, 10.5, 11, 11.5, 12, 12.5, 13, 13.5, 14, 15, 16, 17, 18, 20, 21, 22, 23, 24, 26, 28, 34] as const;

// control sizes: --ctl, --ico, --chip (desktop, then the phone override)
export const controls = {
  control: 32,
  controlPhone: 30,
  icon: 18,
  iconPhone: 16,
  chip: 28,
  chipPhone: 26,
};
