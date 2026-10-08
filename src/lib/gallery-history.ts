type GalleryBrowser = Pick<
  Window,
  "history" | "location" | "addEventListener" | "removeEventListener"
>;

export function galleryHistory(browser: GalleryBrowser, onBack: () => void) {
  let active = false;
  let consuming = false;
  let disposed = false;
  const marker = `gallery-${Date.now()}-${Math.random()}`;
  const detach = () => browser.removeEventListener("popstate", onPop);
  const onPop = () => {
    if (consuming) {
      consuming = false;
      if (disposed) detach();
      return;
    }
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
