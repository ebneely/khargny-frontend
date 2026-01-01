"use client";
import Image from "next/image";

export default function HeaderNavigation() {
  return (
    <div className="flex h-24 w-full flex-1 items-center justify-between rounded-md bg-opacity-10 bg-clip-padding px-4 backdrop-blur-lg backdrop-filter">
      <div className="flex items-center justify-start lg:flex-1">
        <div className="w-16">
          <Image
            src="/images/logo-en.png"
            alt="5argny Logo"
            width={200}
            height={200}
            priority
          />
        </div>
      </div>
      <nav className="hidden lg:flex items-center space-x-6">
      </nav>
    </div>
  );
}
