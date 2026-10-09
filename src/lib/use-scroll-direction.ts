"use client";

import { useEffect, type RefObject } from "react";
import { initialScrollDirection, scrollDirection } from "./scroll-direction";

export function useScrollDirection(headerRef: RefObject<HTMLElement | null>, menuOpen: boolean) {
  useEffect(() => {
    const header = headerRef.current;
    if (!header || typeof window.requestAnimationFrame !== "function") return;
    const document = window.document;
    const root = document.documentElement;
    let state = initialScrollDirection(window.scrollY);
    state.hidden = root.getAttribute("data-header") === "hidden";
    let frame = 0;
    let height = header.getBoundingClientRect().height;
    let dialogsOpen = false;
    let locksDirty = true;

    const setLength = (name: string, value: string) => {
      if (root.style.getPropertyValue(name) !== value) root.style.setProperty(name, value);
    };
    const publish = () => {
      const value = state.hidden ? "hidden" : "shown";
      if (root.getAttribute("data-header") !== value) root.setAttribute("data-header", value);
      setLength("--header-offset", state.hidden ? "0px" : `${height}px`);
    };
    const update = () => {
      frame = 0;
      if (locksDirty) {
        dialogsOpen = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"], [aria-modal="true"], dialog[open]')).some(dialog => {
          if (dialog.closest('[hidden], [aria-hidden="true"]')) return false;
          const style = window.getComputedStyle(dialog);
          return style.display !== "none" && style.visibility !== "hidden" && dialog.getClientRects().length > 0;
        });
        locksDirty = false;
      }
      const viewport = root.clientHeight || window.innerHeight;
      const limit = Math.max(0, Math.max(root.scrollHeight, document.body.scrollHeight) - viewport);
      state = scrollDirection(state, Math.min(limit, Math.max(0, window.scrollY)), {
        locked: menuOpen || dialogsOpen || header.contains(document.activeElement),
        scrollable: limit > 0,
      });
      publish();
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    const measure = () => {
      height = header.getBoundingClientRect().height;
      setLength("--site-header-height", `${height}px`);
      publish();
      schedule();
    };
    const focus = () => {
      if (header.contains(document.activeElement)) {
        state = scrollDirection(state, window.scrollY, { locked: true });
        publish();
      }
      schedule();
    };
    const restore = () => {
      state = initialScrollDirection(window.scrollY);
      state.hidden = root.getAttribute("data-header") === "hidden";
      schedule();
    };
    const changes = new window.MutationObserver(() => {
      locksDirty = true;
      schedule();
    });
    changes.observe(document.body, {
      childList: true, subtree: true, attributes: true,
      attributeFilter: ["role", "aria-modal", "aria-hidden", "hidden", "open", "data-state", "style", "class"],
    });
    const sizes = new window.ResizeObserver(measure);
    sizes.observe(header);
    sizes.observe(document.body);
    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", measure);
    window.addEventListener("pageshow", schedule);
    window.addEventListener("khg:browse-restore", restore);
    document.addEventListener("focusin", focus);
    document.addEventListener("focusout", schedule);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", measure);
      window.removeEventListener("pageshow", schedule);
      window.removeEventListener("khg:browse-restore", restore);
      document.removeEventListener("focusin", focus);
      document.removeEventListener("focusout", schedule);
      changes.disconnect();
      sizes.disconnect();
      root.removeAttribute("data-header");
      root.style.removeProperty("--header-offset");
      root.style.removeProperty("--site-header-height");
    };
  }, [headerRef, menuOpen]);
}
