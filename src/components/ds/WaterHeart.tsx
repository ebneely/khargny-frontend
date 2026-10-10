"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";
import { LIKE_HEART_PATH } from "./LikeIcon";
import { MOTION, MOTION_EASING } from "@/lib/motion";
import { animateWater } from "@/lib/motion-water";
import type { LikeGesture } from "@/lib/like-interaction";
import styles from "./DropMotion.module.css";

export function WaterHeart({
  filled,
  motion,
  reduced,
  size,
  held = false,
}: {
  filled: boolean;
  motion: LikeGesture;
  reduced: boolean;
  size: number;
  held?: boolean;
}) {
  const clip = useId();
  const heart = useRef<SVGSVGElement>(null);
  const water = useRef<SVGGElement>(null);
  const crest = useRef<SVGPathElement>(null);
  const active = useRef<Animation | undefined>(undefined);
  const wave = useRef<Animation | undefined>(undefined);
  const target = motion.kind === "waiting" ? false : filled;
  const [initial] = useState(target);
  useLayoutEffect(() => {
    heart.current?.getAnimations?.().forEach((animation) => {
      animation.currentTime = 0;
    });
  }, [motion.sequence]);
  useLayoutEffect(() => {
    if (!water.current || held) return;
    const own = ["like", "landing", "drain", "restore"].includes(motion.kind);
    active.current = animateWater(
      water.current,
      target ? 0 : 24,
      target ? MOTION.fill : MOTION.drain,
      motion.delay,
      active.current,
      reduced || !own,
    );
    wave.current?.cancel();
    if (own && target && !reduced && crest.current?.animate) {
      wave.current = crest.current.animate(
        [{ transform: "translateX(-24px)" }, { transform: "translateX(24px)" }],
        {
          duration: MOTION.fill,
          delay: motion.delay,
          easing: MOTION_EASING.water,
          fill: "both",
        },
      );
    }
  }, [target, motion.sequence, motion.kind, motion.delay, reduced, held]);
  useLayoutEffect(
    () => () => {
      active.current?.cancel();
      wave.current?.cancel();
    },
    [],
  );
  return (
    <svg
      ref={heart}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`${styles.heart} ${styles[motion.kind] ?? ""}`}
    >
      <defs>
        <clipPath id={clip}>
          <path d={LIKE_HEART_PATH} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        <g
          data-like-water
          ref={water}
          className={styles.water}
          style={{ transform: `translateY(${initial ? 0 : 24}px)` }}
        >
          <path
            ref={crest}
            className={styles.crest}
            fill="var(--like-red)"
            d="M-48 2H8Q12-2 16 2H72V48H-48Z"
          />
        </g>
      </g>
      <path
        data-like-outline
        d={LIKE_HEART_PATH}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
