"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useGlobalStore } from "@/store/useGlobalStore";
import Darkmode from "./Darkmode";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Home, Shield, Mail, Map } from "lucide-react";

export default function Dnavbar() {
  const router = useRouter();
  const { setisActive } = useGlobalStore();

  const handleNavigation = (path: string) => {
    setisActive(false);
    router.push(path);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full space-y-8 p-6">
      <nav className="flex flex-col items-center space-y-6 w-full">
        <button
          onClick={() => handleNavigation("/")}
          className="text-2xl font-semibold text-foreground hover:text-primary transition-colors flex items-center gap-2 cursor-pointer"
        >
          <Home className="h-6 w-6" />
          Home
        </button>
        <button
          onClick={() => handleNavigation("/explorer")}
          className="text-2xl font-semibold text-foreground hover:text-primary transition-colors flex items-center gap-2 cursor-pointer"
        >
          <Map className="h-6 w-6" />
          Explorer
        </button>
      </nav>
      
      <Separator className="w-32" />
      
      <div className="flex flex-col items-center gap-6 w-full max-w-sm">
        <div className="flex flex-col gap-2 text-sm text-muted-foreground text-center">
          <p className="font-medium">Theme Settings</p>
        </div>
        <Darkmode />
        
        <Separator className="w-32" />
        
        <div className="flex flex-col gap-3 w-full">
          <Button
            variant="outline"
            asChild
            className="w-full h-12"
            size="lg"
          >
            <Link href="/privacy" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Privacy Policy
            </Link>
          </Button>
          <Button
            variant="outline"
            asChild
            className="w-full h-12"
            size="lg"
          >
            <Link href="/contact" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Contact & Feedback
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}