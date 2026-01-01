// src/components/reveal-cards.tsx
"use client";

import React, { useRef } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useMotionTemplate,
} from "framer-motion";
import { FiArrowUpRight, FiMousePointer } from "react-icons/fi";

interface RevealCardsProps {
  onOpenLocationSelect: () => void; // Changed from onOpenFilterModal
}

const ROTATION_RANGE = 32.5;
const HALF_ROTATION_RANGE = ROTATION_RANGE / 2;

const RevealCards: React.FC<RevealCardsProps> = ({ onOpenLocationSelect }) => {
  const ref = useRef<HTMLDivElement>(null);

  // motion values
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const xSpring = useSpring(x);
  const ySpring = useSpring(y);

  // 3D transform string
  const transform = useMotionTemplate`rotateX(${xSpring}deg) rotateY(${ySpring}deg)`;

  // pointer handlers
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) * ROTATION_RANGE;
    const mouseY = (e.clientY - rect.top) * ROTATION_RANGE;

    const rX = (mouseY / rect.height - HALF_ROTATION_RANGE) * -1;
    const rY = mouseX / rect.width - HALF_ROTATION_RANGE;

    x.set(rX);
    y.set(rY);
  };
  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <div className="flex w-full items-center justify-center bg-gradient-to-br px-4 py-4 text-slate-900 min-h-0">
      <motion.div
        ref={ref}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ transformStyle: "preserve-3d", transform }}
        className="relative h-96 w-72 rounded-xl bg-gradient-to-br from-indigo-300 to-violet-300"
      >
        <div
          style={{
            transform: "translateZ(75px)",
            transformStyle: "preserve-3d",
          }}
          className="absolute inset-4 grid place-content-center rounded-xl bg-white p-6 shadow-lg"
        >
          <FiMousePointer
            style={{ transform: "translateZ(75px)" }}
            className="mx-auto text-4xl"
          />
          <button
            type="button"
            onClick={onOpenLocationSelect} // Changed to use the new prop
            style={{ transform: "translateZ(40px)" }}
            className="mt-6 flex items-center space-x-2 rounded border px-3 py-1 text-sm font-medium text-gray-800 transition hover:bg-gray-100"
          >
            <span>Choose your location Now!</span>
            <FiArrowUpRight />
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default RevealCards;
