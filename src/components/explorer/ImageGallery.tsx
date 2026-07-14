'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ImageOff } from 'lucide-react';

interface GalleryImage {
  url: string;
  alt?: string;
}

interface ImageGalleryProps {
  images: GalleryImage[];
}

export function ImageGallery({ images }: ImageGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (images.length === 0) return null;

  const active = images[activeIndex];

  return (
    <div className="space-y-3">
      <div className="relative aspect-video rounded-xl overflow-hidden bg-muted">
        <Image
          src={active.url}
          alt={active.alt || 'Place image'}
          fill
          className="object-cover"
          priority
        />
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              className={`relative w-16 h-16 shrink-0 rounded-lg overflow-hidden border-2 transition-colors ${
                i === activeIndex ? 'border-orange-500' : 'border-transparent'
              }`}
            >
              <Image
                src={img.url}
                alt={img.alt || ''}
                fill
                className="object-cover"
                sizes="64px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
