"use client";

import { useEffect, useState, type RefObject } from "react";

export const reducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

export function useReducedMotion() {
  const [reduced, setReduced] = useState(reducedMotion);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const query = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query?.matches === true);
    query?.addEventListener?.("change", update);
    update();
    return () => query?.removeEventListener?.("change", update);
  }, []);
  return reduced;
}

export function useMotionVisibility(
  control: RefObject<HTMLElement | null>,
  enabled = true,
) {
  const [visible, setVisible] = useState(
    typeof IntersectionObserver === "undefined",
  );
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      setVisible(entries.some((entry) => entry.isIntersecting));
    });
    if (control.current) observer.observe(control.current);
    return () => observer.disconnect();
  }, [control, enabled]);
  return visible;
}
