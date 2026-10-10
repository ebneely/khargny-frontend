"use client";

import { useState, type KeyboardEvent } from "react";

export function usePressFeedback() {
  const [pressed, setPressed] = useState(false);
  const release = () => setPressed(false);
  return {
    "data-pressed": pressed || undefined,
    onPointerDown: () => setPressed(true),
    onPointerUp: release,
    onPointerCancel: release,
    onPointerLeave: release,
    onBlur: release,
    onClick: release,
    onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === "Enter" || event.key === " ") setPressed(true);
    },
    onKeyUp: release,
  };
}
