type GalleryBrowser = Pick<
  Window,
  "history" | "location" | "addEventListener" | "removeEventListener"
>;

/**
 * Closing a viewer steps back over its own history entry, and that step arrives as a popstate
 * like any other. A viewer opened right after another one closed must not mistake that step for
 * the visitor pressing Back and close itself. The count of such steps still on their way is
 * shared by every viewer of the same window.
 */
const ownSteps = new WeakMap<object, { pending: number }>();

export function galleryHistory(browser: GalleryBrowser, onBack: () => void) {
  const shared = ownSteps.get(browser) ?? { pending: 0 };
  ownSteps.set(browser, shared);
  let active = false;
  let consuming = false;
  let disposed = false;
  const marker = `gallery-${Date.now()}-${Math.random()}`;
  const detach = () => browser.removeEventListener("popstate", onPop);
  const onPop = () => {
    if (consuming) {
      consuming = false;
      // After every listener of this popstate has run, the step is no longer on its way.
      setTimeout(() => {
        shared.pending = Math.max(0, shared.pending - 1);
      }, 0);
      if (disposed) detach();
      return;
    }
    if (shared.pending > 0) return;
    if (active) {
      active = false;
      onBack();
    }
  };
  browser.addEventListener("popstate", onPop);
  const close = () => {
    if (!active) return;
    active = false;
    if (browser.history.state?.khgGallery === marker) {
      consuming = true;
      shared.pending += 1;
      browser.history.back();
    }
  };
  return {
    open() {
      if (active || consuming || disposed) return;
      browser.history.pushState(
        { ...browser.history.state, khgGallery: marker },
        "",
        browser.location.href,
      );
      active = true;
    },
    close,
    dispose() {
      disposed = true;
      close();
      if (!consuming) detach();
    },
  };
}
