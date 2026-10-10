'use client';

import { compactCount } from "@/lib/compact-count";
import styles from "./RollingCount.module.css";
import { motionProperties } from '@/lib/motion';
import { useState, type CSSProperties } from 'react';

function CountValue({ count, quiet, down }: { count: number; quiet: boolean; down: boolean }) {
  const [still] = useState(quiet);
  return (
    <span className={styles.roll} style={{ '--count-roll-from': down ? '-100%' : '100%', ...(still ? { animation: 'none' } : {}) } as CSSProperties}>
      {compactCount(count)}
    </span>
  );
}

export function RollingCount({
  count,
  className = "",
  quiet = false,
}: {
  count: number;
  className?: string;
  quiet?: boolean;
}) {
  const [value, setValue] = useState({ count, down: false });
  if (value.count !== count) setValue({ count, down: count < value.count });
  return (
    <span
      dir="ltr"
      aria-hidden="true"
      className={`${styles.count} ${className}`}
      style={motionProperties() as CSSProperties}
    >
      <CountValue key={count} count={count} quiet={quiet} down={value.down} />
    </span>
  );
}
