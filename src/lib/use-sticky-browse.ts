"use client";

import { useLayoutEffect, useRef } from "react";

export function useStickyBrowse() {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const blockRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const sentinel = sentinelRef.current;
    const block = blockRef.current;
    const content = contentRef.current;
    if (!sentinel || !block || !content || typeof window.IntersectionObserver !== "function") return;
    const root = window.document.documentElement;
    let stuck = block.getAttribute("data-stuck") === "true";
    let observer: IntersectionObserver;
    let offset = "";
    let frame = 0;
    const reserve = () => {
      const compact = block.getAttribute("data-stuck") === "true";
      if (compact) block.setAttribute("data-stuck", "false");
      const height = `${content.getBoundingClientRect().height}px`;
      if (compact) block.setAttribute("data-stuck", "true");
      if (block.style.getPropertyValue("--browse-reserved-height") !== height) {
        block.style.setProperty("--browse-reserved-height", height);
      }
    };
    const observe = () => {
      frame = 0;
      const next = window.getComputedStyle(root).getPropertyValue("--header-offset").trim() || "0px";
      if (next === offset) return;
      offset = next;
      observer?.disconnect();
      observer = new window.IntersectionObserver(([entry]) => {
        const nextStuck = !entry.isIntersecting && entry.boundingClientRect.bottom <= (entry.rootBounds?.top ?? 0);
        if (nextStuck === stuck) return;
        if (nextStuck) reserve();
        stuck = nextStuck;
        block.setAttribute("data-stuck", String(stuck));
        if (!stuck) reserve();
      }, { rootMargin: `-${offset} 0px 0px 0px`, threshold: 0 });
      observer.observe(sentinel);
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(observe);
    };
    reserve();
    observe();
    const sizes = new window.ResizeObserver(reserve);
    sizes.observe(content);
    const header = new window.MutationObserver(schedule);
    header.observe(root, { attributes: true, attributeFilter: ["data-header", "style"] });
    const controls = new window.MutationObserver(reserve);
    controls.observe(content, { childList: true, subtree: true, characterData: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("pageshow", schedule);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      sizes.disconnect();
      header.disconnect();
      controls.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("pageshow", schedule);
    };
  }, []);

  return { sentinelRef, blockRef, contentRef };
}
