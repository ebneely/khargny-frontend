"use client";

import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { MOTION, motionProperties } from "@/lib/motion";
import { useReducedMotion } from "@/lib/motion-client";
import { animateWater } from "@/lib/motion-water";
import styles from "./DropMotion.module.css";

const BOOKMARK_PATH = "M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z";

export function SaveIcon({
  filled,
  sequence = 0,
}: {
  filled: boolean;
  sequence?: number;
}) {
  const clip = useId();
  const water = useRef<SVGGElement>(null);
  const active = useRef<Animation | undefined>(undefined);
  const previous = useRef({ filled, sequence, active: false });
  const [initial] = useState(filled);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [phase, setPhase] = useState("");
  const reduced = useReducedMotion();
  useLayoutEffect(() => {
    const own =
      sequence !== previous.current.sequence ||
      (previous.current.active && filled !== previous.current.filled);
    clearTimeout(timer.current);
    const kind = !reduced && own ? (filled ? "save" : "unsave") : "";
    previous.current = { filled, sequence, active: Boolean(kind) };
    setPhase(kind);
    if (water.current)
      active.current = animateWater(
        water.current,
        filled ? 0 : -24,
        filled ? MOTION.save : MOTION.drain,
        0,
        active.current,
        !kind,
      );
    if (kind)
      timer.current = setTimeout(
        () => {
          previous.current.active = false;
          setPhase("");
        },
        filled ? MOTION.save : MOTION.drain,
      );
  }, [filled, sequence, reduced]);
  useLayoutEffect(
    () => () => {
      clearTimeout(timer.current);
      active.current?.cancel();
    },
    [],
  );
  return (
    <svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      aria-hidden="true"
      data-save-phase={phase || "rest"}
      className={phase ? styles[phase] : undefined}
      style={motionProperties() as CSSProperties}
    >
      <defs>
        <clipPath id={clip}>
          <path d={BOOKMARK_PATH} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        <g
          ref={water}
          className={styles.water}
          style={{ transform: `translateY(${initial ? 0 : -24}px)` }}
        >
          <path d="M0 0H24V24H0Z" fill="var(--brand-700)" />
        </g>
      </g>
      <path
        d={BOOKMARK_PATH}
        fill="none"
        stroke={filled ? "var(--brand-700)" : "currentColor"}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
