import React from "react";
import { Icon } from "@iconify/react";
import { CustomImage } from "@/components/ui/image";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Outing } from "@/types";

interface PhotosTabProps {
  outing: Outing;
}

export const PhotosTab: React.FC<PhotosTabProps> = ({ outing }) => {
  const [selectedImageIndex, setSelectedImageIndex] = React.useState<
    number | null
  >(null);
  const [visiblePhotoCount, setVisiblePhotoCount] = React.useState(6); // Initial load: 6 photos
  const sentinelRef = React.useRef<HTMLDivElement>(null);

  // Reset visible count when outing changes
  React.useEffect(() => {
    setVisiblePhotoCount(6);
  }, [outing.placeId]);

  // Load more photos when sentinel element comes into view (Intersection Observer)
  React.useEffect(() => {
    if (!outing.images || outing.images.length <= visiblePhotoCount || !sentinelRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisiblePhotoCount((prev) => 
            Math.min(prev + 6, outing.images!.length)
          );
        }
      },
      {
        rootMargin: '100px', // Start loading 100px before reaching the sentinel
      }
    );

    observer.observe(sentinelRef.current);

    return () => {
      observer.disconnect();
    };
  }, [visiblePhotoCount, outing.images]);

  const visibleImages = outing.images?.slice(0, visiblePhotoCount) || [];
  const hasMore = outing.images && outing.images.length > visiblePhotoCount;

  // Get the selected image URL if an image is selected
  const selectedImage =
    selectedImageIndex !== null && outing.images
      ? outing.images[selectedImageIndex]
      : null;

  // Handle clicking on a photo
  const handlePhotoClick = (index: number) => {
    setSelectedImageIndex(index);
  };

  // Handle closing the enlarged view
  const handleClose = () => {
    setSelectedImageIndex(null);
  };

  return (
    <div className="relative p-4 sm:p-6 md:p-8">
      {/* Photo gallery with grid layout */}
      {outing.images && outing.images.length > 0 ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
            {visibleImages.map((image, index) => (
              <div
                key={index}
                onClick={() => handlePhotoClick(index)}
                className="group relative cursor-pointer overflow-hidden rounded-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <div className="relative aspect-[4/3]">
                  <CustomImage
                    src={image}
                    alt={`${outing.title} photo ${index + 1}`}
                    className="h-full w-full"
                    fill
                    objectFit="cover"
                    priority={index < 3} // Only prioritize first 3 images
                  />
                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 transition-opacity group-hover:opacity-100" />
                  <div className="absolute bottom-2 right-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <div className="rounded-full bg-white/90 p-1.5 backdrop-blur-sm">
                      <Icon icon="lucide:zoom-in" width={16} height={16} className="text-gray-800" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Sentinel element for Intersection Observer - triggers loading more photos */}
          {hasMore && (
            <div ref={sentinelRef} className="mt-4 flex justify-center py-4">
              <div className="text-sm text-muted-foreground">
                Loading more photos...
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex h-[300px] flex-col items-center justify-center text-center">
          <div className="rounded-full bg-gradient-to-br from-gray-100 to-gray-200 p-4 mb-3">
            <Icon
              icon="lucide:image-off"
              className="text-gray-400"
              width={32}
              height={32}
            />
          </div>
          <p className="text-sm text-muted-foreground">No photos available</p>
        </div>
      )}

      {/* Lightbox view */}
      <Dialog open={selectedImageIndex !== null} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="max-w-[95vw] h-[95vh] p-0 bg-black border-none">
          <VisuallyHidden>
            <DialogTitle>Photo Gallery</DialogTitle>
          </VisuallyHidden>
          <div className="relative w-full h-full flex flex-col">
            {/* Top bar with controls */}
            <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/50 to-transparent">
              <div className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-md">
                {selectedImageIndex !== null && outing.images
                  ? `${selectedImageIndex + 1} / ${outing.images.length}`
                  : ""}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="rounded-lg bg-white/10 text-white backdrop-blur-md hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Image container */}
            <div className="flex-1 flex items-center justify-center p-4">
              {selectedImage && (
                <div className="relative w-full h-full">
                  <CustomImage
                    src={selectedImage}
                    alt={`${outing.title} enlarged photo`}
                    className="mx-auto h-full w-full"
                    fill
                    objectFit="contain"
                  />
                </div>
              )}
            </div>

            {/* Navigation buttons */}
            {outing.images && outing.images.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setSelectedImageIndex((prev) =>
                      prev !== null
                        ? prev > 0
                          ? prev - 1
                          : outing.images!.length - 1
                        : null
                    );
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 text-white shadow-lg backdrop-blur-md hover:bg-white/20 h-12 w-12"
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setSelectedImageIndex((prev) =>
                      prev !== null
                        ? prev < outing.images!.length - 1
                          ? prev + 1
                          : 0
                        : null
                    );
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 text-white shadow-lg backdrop-blur-md hover:bg-white/20 h-12 w-12"
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
