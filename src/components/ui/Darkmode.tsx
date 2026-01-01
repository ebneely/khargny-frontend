"use client";

import { motion } from "framer-motion";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TOGGLE_CLASSES =
  "text-sm font-medium flex items-center gap-2 px-3 md:pl-3 md:pr-3.5 py-3 md:py-1.5 transition-colors relative z-10";

type ToggleOptionsType = "light" | "dark" | undefined;

const Darkmode = () => {
  const { theme, setTheme, systemTheme } = useTheme();
  const [selected, setSelected] = useState<ToggleOptionsType>(undefined);
  const [mounted, setMounted] = useState(false);

  // Wait until theme is loaded, then update selected state
  useEffect(() => {
    setMounted(true);
    if (theme === "system") {
      setSelected(systemTheme as ToggleOptionsType);
    } else if (theme) {
      setSelected(theme as ToggleOptionsType);
    }
  }, [theme, systemTheme]);

  if (!mounted || !selected) {
    return (
      <div className="h-10 w-24 rounded-full bg-muted animate-pulse" />
    );
  }

  return (
    <div className="grid h-fit place-content-center transition-colors">
      <SliderToggle selected={selected} setSelected={setSelected} />
    </div>
  );
};

const SliderToggle = ({
  selected,
  setSelected,
}: {
  selected: ToggleOptionsType;
  setSelected: Dispatch<SetStateAction<ToggleOptionsType>>;
}) => {
  const { setTheme } = useTheme();

  return (
    <div className="relative flex w-fit items-center rounded-full bg-muted p-1">
      <button
        className={cn(
          TOGGLE_CLASSES,
          "rounded-full",
          selected === "light" ? "text-foreground" : "text-muted-foreground"
        )}
        onClick={() => {
          setSelected("light");
          setTheme("light");
        }}
        aria-label="Switch to light mode"
      >
        <Moon className="relative z-10 h-4 w-4 md:h-3.5 md:w-3.5" />
        <span className="relative z-10 hidden sm:inline">Light</span>
      </button>
      <button
        className={cn(
          TOGGLE_CLASSES,
          "rounded-full",
          selected === "dark" ? "text-foreground" : "text-muted-foreground"
        )}
        onClick={() => {
          setSelected("dark");
          setTheme("dark");
        }}
        aria-label="Switch to dark mode"
      >
        <Sun className="relative z-10 h-4 w-4 md:h-3.5 md:w-3.5" />
        <span className="relative z-10 hidden sm:inline">Dark</span>
      </button>
      <motion.div
        layout
        transition={{ type: "spring", damping: 15, stiffness: 250 }}
        className={cn(
          "absolute inset-y-1 z-0 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500",
          selected === "dark" ? "left-1/2 right-1" : "left-1 right-1/2"
        )}
      />
    </div>
  );
};

export default Darkmode;
