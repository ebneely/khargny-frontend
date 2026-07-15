"use client";
/**
 * ImageGallery — restyled against the Khargny Design System (TASK-0008).
 * Renders a 2-column grid of place images; falls back to the gradient placeholder when
 * no images are supplied (per the design system readme §Imagery — no real photography).
 */
import * as React from "react";
import { ImageOff } from "lucide-react";

type ImageGalleryProps = {
  images: { url: string; alt?: string }[];
};

export function ImageGallery({ images }: ImageGalleryProps) {
  if (images.length === 0) {
    return (
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "4 / 3",
          borderRadius: "var(--radius-xl)",
          background: "var(--gradient-sunset-radial)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "rgba(255,255,255,0.7)",
        }}
      >
        <ImageOff size={48} strokeWidth={1.5} />
      </div>
    );
  }
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: images.length === 1 ? "1fr" : "repeat(2, 1fr)",
        gap: "var(--space-2)",
      }}
    >
      {images.map((img, i) => (
        <div
          key={i}
          style={{
            position: "relative",
            aspectRatio: "4 / 3",
            borderRadius: "var(--radius-lg)",
            overflow: "hidden",
            background: `center/cover no-repeat url(${img.url})`,
          }}
          aria-label={img.alt || `Image ${i + 1}`}
          role="img"
        />
      ))}
    </div>
  );
}
