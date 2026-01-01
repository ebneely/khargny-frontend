"use client";

import { useEffect, useState } from "react";
import { useGlobalStore } from "@/store/useGlobalStore";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import dynamic from "next/dynamic";

const Dnavbar = dynamic(() => import("./Dnavbar"), { ssr: false });

export default function Navbar() {
  const { isActive, setisActive } = useGlobalStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="relative">
      <Sheet open={isActive} onOpenChange={setisActive}>
        <SheetTrigger asChild className="hidden">
          <Button
            variant="default"
            size="icon"
            className="z-50 rounded-full h-10 w-10 bg-black text-white shadow-lg transition-all hover:shadow-xl hover:scale-105"
          >
            {isActive ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </SheetTrigger>
        <SheetContent
          side="right"
          className="w-full sm:w-[400px] bg-background/95 backdrop-blur-lg border-l"
        >
          <div className="flex h-full items-center justify-center">
            <Dnavbar />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
