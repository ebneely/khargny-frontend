  /* eslint-disable @typescript-eslint/no-unused-vars */
"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";
import Hero from "@/components/home/Hero";
import Features from "@/components/home/Features";
import HeaderNavigation from "@/components/home/HeaderNavigation";

import { useGlobalStore } from "@/store/useGlobalStore";
import Navbar from "@/components/ui/Navbar";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

export default function Home() {
  const { marquebut, setmarquebut, isActive, setisActive } = useGlobalStore();

  const ctaRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(ctaRef, { margin: "0px 0px -100% 0px" });

  useEffect(() => {
    if (marquebut) {
      if (ctaRef.current) {
        ctaRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      setmarquebut(false);
    }
  }, [marquebut, setmarquebut]);

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="relative lg:space-y-14">
        <div className="flex items-center justify-between px-4 lg:px-0">
          <div className="lg:px-14">
            <HeaderNavigation />
          </div>
        </div>

        <div>
          <Hero />
          <Features ref={ctaRef} />
        </div>
      </div>

      {/* Mobile Navbar Button - Fixed Bottom Right */}
      <Button
        onClick={() => setisActive(true)}
        size="icon"
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-black text-white dark:bg-white dark:text-black shadow-lg transition-all hover:scale-105 hover:shadow-xl sm:hidden"
      >
        <Menu className="h-6 w-6" />
      </Button>

      {/* Navbar Sheet */}
      <Navbar />
    </div>
  );
}
