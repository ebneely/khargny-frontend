/** What a page area shows while its page loads: the frame (bars, sidebar) is already on screen, so only this column is empty. */
export function PageFallback() {
  return <main className="page" id="view" aria-busy="true" />;
}
