/* eslint-disable @typescript-eslint/no-unused-vars */
import React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Icon } from "@iconify/react";
import { MapPin, Star, Clock, X, DollarSign } from "lucide-react";
import { Outing, TabKey } from "@/types";
import { InfoTab } from "./detail-tabs/info-tab";
import { HoursTab } from "./detail-tabs/hours-tab";
import { ReviewsTab } from "./detail-tabs/reviews-tab";
import { PhotosTab } from "./detail-tabs/photos-tab";

interface OutingDetailModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onClose: () => void;
  selectedOuting: Outing | null;
}

export const OutingDetailModal: React.FC<OutingDetailModalProps> = ({
  isOpen,
  onOpenChange,
  onClose,
  selectedOuting,
}) => {
  const [selectedTab, setSelectedTab] = React.useState<TabKey>("info");

  if (!selectedOuting) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] w-full p-0 pb-0">
        <Tabs
          value={selectedTab}
          onValueChange={(value) => setSelectedTab(value as TabKey)}
          className="flex flex-col h-full p-6 pb-0"
        >
          <SheetHeader>
            <SheetTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4 mb-3 pr-8">
              <div className="flex items-start justify-between w-full sm:w-auto gap-2">
                <span className="text-lg sm:text-xl font-bold line-clamp-2 flex-1">{selectedOuting.title}</span>
                <div className="flex items-center gap-1 flex-shrink-0 sm:hidden">
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  <span className="font-semibold text-sm">{selectedOuting.rating}</span>
                </div>
              </div>
              <div className="w-full sm:w-auto sm:flex-1 flex justify-start sm:justify-center sm:-ml-4">
                <TabsList className="grid grid-cols-4 h-9 sm:h-8 w-full sm:w-auto text-[10px] sm:text-xs">
                  <TabsTrigger value="info" className="text-xs">Info</TabsTrigger>
                  <TabsTrigger value="hours" className="text-xs">Hours</TabsTrigger>
                  <TabsTrigger value="reviews" className="text-xs">Reviews</TabsTrigger>
                  <TabsTrigger value="photos" className="text-xs">Photos</TabsTrigger>
                </TabsList>
              </div>
              <div className="hidden sm:flex items-center gap-1 flex-shrink-0">
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                <span className="font-semibold text-sm">{selectedOuting.rating}</span>
                <span className="text-muted-foreground text-xs">
                  (
                  {selectedOuting.user_ratings_total ||
                    selectedOuting.reviewCount}{" "}
                  reviews)
                </span>
              </div>
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-hidden">
          <TabsContent value="info" className="h-full overflow-y-auto scrollbar-hide">
            <div className="flex flex-wrap gap-1 sm:gap-1.5 mb-2 sm:mb-3">
              {selectedOuting.types && selectedOuting.types.map((type, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="truncate text-xs py-0.5"
                >
                  {type.icon && (
                    <Icon
                      icon={type.icon}
                      className="mr-1 inline-flex shrink-0 align-middle"
                      width={14}
                      height={14}
                    />
                  )}
                  <span className="inline-flex align-middle">
                    {type.name}
                  </span>
                </Badge>
              ))}

              {selectedOuting.open_now !== undefined && (
                <Badge
                  variant={selectedOuting.open_now ? "default" : "secondary"}
                  className="text-xs py-0.5"
                >
                  {selectedOuting.open_now ? (
                    <Clock className="mr-1 h-3 w-3" />
                  ) : (
                    <X className="mr-1 h-3 w-3" />
                  )}
                  <span className="inline-flex align-middle">
                    {selectedOuting.open_now ? "Open Now" : "Closed"}
                  </span>
                </Badge>
              )}

              {selectedOuting.price_level !== undefined && (
                <Badge variant="outline" className="text-xs py-0.5">
                  <DollarSign className="mr-1 h-3 w-3" />
                  <span className="inline-flex align-middle">
                    Price Level: {selectedOuting.price_level}/5
                  </span>
                </Badge>
              )}

              {!selectedOuting.types && selectedOuting.category && (
                <Badge variant="secondary" className="text-xs py-0.5">
                  <span className="inline-flex align-middle">
                    {selectedOuting.category}
                  </span>
                </Badge>
              )}
            </div>
            <InfoTab outing={selectedOuting} />
          </TabsContent>
          <TabsContent value="hours" className="h-full overflow-y-auto scrollbar-hide">
            <HoursTab outing={selectedOuting} />
          </TabsContent>
          <TabsContent value="reviews" className="h-full overflow-y-auto scrollbar-hide">
            <ReviewsTab outing={selectedOuting} />
          </TabsContent>
          <TabsContent value="photos" className="h-full">
            <ScrollArea className="h-full">
              <PhotosTab outing={selectedOuting} />
            </ScrollArea>
          </TabsContent>
        </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};
