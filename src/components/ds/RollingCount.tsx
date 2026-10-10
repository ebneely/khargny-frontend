import { compactCount } from "@/lib/compact-count";
import styles from "./RollingCount.module.css";

export function RollingCount({
  count,
  className = "",
}: {
  count: number;
  className?: string;
}) {
  return (
    <span
      dir="ltr"
      aria-hidden="true"
      className={`${styles.count} ${className}`}
    >
      <span key={count} className={styles.roll}>
        {compactCount(count)}
      </span>
    </span>
  );
}
