"use client";
/**
 * ImageGallery — restyled against the Khargny Design System (TASK-0008).
 * Renders a 2-column grid of place images; falls back to the gradient placeholder when
 * no images are supplied (per the design system readme §Imagery — no real photography).
 */
import * as React from "react";
import { ImageOff, X } from "lucide-react";

type ImageGalleryProps = {
  images: { url: string; alt?: string }[];
};

export function ImageGallery({ images }: ImageGalleryProps) {
  const [preview, setPreview] = React.useState<string | null>(null);

  // Close the preview on Escape.
  React.useEffect(() => {
    if (!preview) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreview(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [preview]);

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
        <button
          key={i}
          type="button"
          onClick={() => setPreview(img.url)}
          aria-label={`View ${img.alt || `image ${i + 1}`} full size`}
          style={{
            position: "relative",
            aspectRatio: "4 / 3",
            borderRadius: "var(--radius-lg)",
            overflow: "hidden",
            border: "none",
            padding: 0,
            cursor: "zoom-in",
            background: `center/cover no-repeat url(${img.url})`,
          }}
        />
      ))}

      {preview && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
          onClick={() => setPreview(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Preview"
            style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: "var(--radius-lg)" }}
          />
          <button
            type="button"
            aria-label="Close preview"
            onClick={(e) => { e.stopPropagation(); setPreview(null); }}
            style={{
              position: "absolute",
              top: 16,
              right: 16,
              width: 44,
              height: 44,
              borderRadius: "50%",
              border: "none",
              background: "rgba(0,0,0,0.55)",
              color: "#fff",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <X size={20} />
          </button>
        </div>
      )}
    </div>
  );
}
