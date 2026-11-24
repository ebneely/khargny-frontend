"use client";
/**
 * NavProgress — a tap on any in-site link is acknowledged at once.
 *
 * City and place pages are resolved on the server before they answer, because that is where
 * an old address is redirected (308) and an unknown one gets its 404. A loading boundary
 * would let the response start early and lose those statuses (it did, for a few hours), so
 * the wait cannot be hidden behind a placeholder page. Instead the wait is shown: the moment
 * a link is pressed, a thin bar starts across the top and the pressed link dims; both clear
 * when the address changes. Nothing here touches the response.
 *
 * Cached pages now answer at once, so a bar that has run this long means the client-side navigation is stuck: the
 * server render failed, the RSC request was dropped, or the router is waiting on something. After 8 s the browser takes
 * over and loads the address itself (a real document request), and a second tap on the same link does it immediately —
 * that is the "a refresh and a second tap don't help" case from issue #37.
 */
import * as React from "react";

const GIVE_UP_AFTER = 8_000;

export function NavProgress() {
  const [state, setState] = React.useState<"idle" | "running" | "done">("idle");

  React.useEffect(() => {
    let frame = 0;
    let giveUp: ReturnType<typeof setTimeout> | undefined;
    let settle: ReturnType<typeof setTimeout> | undefined;
    let pressed: HTMLAnchorElement | null = null;
    let from = "";
    let pending: string | null = null;

    const clear = () => {
      cancelAnimationFrame(frame);
      clearTimeout(giveUp);
      clearTimeout(settle);
      pressed?.removeAttribute("data-nav-pending");
      pressed = null;
      pending = null;
    };
    const finish = () => {
      clear();
      setState("done");
      settle = setTimeout(() => setState("idle"), 260);
    };
    // The client-side navigation never arrived: ask the browser for the page as a document instead of leaving the
    // visitor on the old one. The bar stays running until the new document replaces this one.
    const hardLoad = (href: string) => {
      clear();
      window.location.assign(href);
    };
    const watch = () => {
      if (window.location.href !== from) return finish();
      frame = requestAnimationFrame(watch);
    };
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      let to: URL;
      try { to = new URL(link.href, window.location.href); } catch { return; }
      if (to.origin !== window.location.origin) return;
      // Same page (or only its #anchor): nothing will load.
      if (to.pathname === window.location.pathname && to.search === window.location.search) return;
      // A second tap while a navigation is still pending: stop waiting and load the address for real.
      if (pending) return hardLoad(to.href);
      clear();
      pressed = link;
      link.setAttribute("data-nav-pending", "true");
      from = window.location.href;
      pending = to.href;
      setState("running");
      frame = requestAnimationFrame(watch);
      giveUp = setTimeout(() => hardLoad(to.href), GIVE_UP_AFTER);
    };
    // After the click's own handlers, so a handler that cancels the navigation is respected.
    document.addEventListener("click", onClick);
    window.addEventListener("pageshow", finish);
    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener("pageshow", finish);
      clear();
    };
  }, []);

  return (
    <>
      <div className="khg-nav-progress" data-state={state} role="progressbar" aria-hidden={state === "idle"} aria-busy={state === "running"} />
      <style>{`
        .khg-nav-progress {
          position: fixed; inset-block-start: 0; inset-inline: 0; z-index: 70;
          height: 3px; pointer-events: none;
          background: var(--brand-600);
          transform-origin: 0 50%;
          transform: scaleX(0); opacity: 0;
        }
        [dir="rtl"] .khg-nav-progress { transform-origin: 100% 50%; }
        /* Quick to show that the tap registered, then slower: it never claims to be finished. */
        .khg-nav-progress[data-state="running"] {
          opacity: 1; transform: scaleX(0.82);
          transition: transform 6s cubic-bezier(0.05, 0.7, 0.1, 1), opacity 80ms linear;
        }
        .khg-nav-progress[data-state="done"] {
          opacity: 0; transform: scaleX(1);
          transition: transform 180ms var(--ease-standard), opacity 220ms var(--ease-standard) 60ms;
        }
        a[data-nav-pending="true"] { opacity: 0.6; transition: opacity 120ms linear; cursor: progress; }
        @media (prefers-reduced-motion: reduce) {
          .khg-nav-progress[data-state="running"] { transform: scaleX(1); transition: opacity 80ms linear; }
          .khg-nav-progress[data-state="done"] { transition: opacity 120ms linear; }
        }
      `}</style>
    </>
  );
}
