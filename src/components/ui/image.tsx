"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface CustomImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  fill?: boolean;
  priority?: boolean;
  objectFit?: "contain" | "cover" | "fill" | "none" | "scale-down";
  onError?: () => void;
}

/**
 * Image component wrapper to replace HeroUI Image
 * Uses Next.js Image with loading states and error handling
 */
export function CustomImage({
  src,
  alt,
  className,
  width,
  height,
  fill = false,
  priority = false,
  objectFit = "cover",
  onError,
}: CustomImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Handle empty string or invalid src - don't render image
  const imageSrc = (src && src.trim() !== "") ? src : null;

  // If no valid src or image failed to load, show error message
  if (!imageSrc || hasError) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted text-muted-foreground",
          className
        )}
        style={fill ? undefined : { width, height }}
      >
        <span className="text-sm">Failed to load image</span>
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {isLoading && (
        <Skeleton
          className={cn("absolute inset-0", fill && "h-full w-full")}
          style={fill ? undefined : { width, height }}
        />
      )}
      <Image
        src={imageSrc}
        alt={alt}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        fill={fill}
        priority={priority}
        className={cn(
          "transition-opacity duration-300",
          isLoading ? "opacity-0" : "opacity-100",
          objectFit === "cover" && "object-cover",
          objectFit === "contain" && "object-contain",
          objectFit === "fill" && "object-fill",
          objectFit === "none" && "object-none",
          objectFit === "scale-down" && "object-scale-down"
        )}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setHasError(true);
          setIsLoading(false);
          onError?.();
        }}
      />
    </div>
  );
}

