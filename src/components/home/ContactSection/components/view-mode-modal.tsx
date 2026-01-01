import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Icon } from "@iconify/react";
import { LayoutGrid, Map, List, Grid } from "lucide-react";

interface ViewModeModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  viewMode: "list" | "map";
  setViewMode: (mode: "list" | "map") => void;
  cardLayout: "grid" | "list";
  setCardLayout: (layout: "grid" | "list") => void;
}

export const ViewModeModal: React.FC<ViewModeModalProps> = ({
  isOpen,
  onOpenChange,
  viewMode,
  setViewMode,
  cardLayout,
  setCardLayout,
}) => {
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[50vh] w-full p-0">
        <div className="flex flex-col max-h-[50vh]">
          <SheetHeader className="px-4 pt-4 pb-3">
            <SheetTitle className="flex items-center gap-2 text-base">
              <Icon icon="lucide:settings" className="h-4 w-4" />
              <span>View & Mode</span>
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-4 pb-4">
            <div className="flex flex-col gap-4">
              {/* View Mode Section */}
              <Card>
                <CardContent className="p-4">
                  <h3 className="mb-3 text-sm font-semibold">View Mode</h3>
                  <div className="flex gap-2">
                    <Button
                      variant={viewMode === "list" ? "default" : "outline"}
                      className="flex-1 h-12"
                      onClick={() => {
                        setViewMode("list");
                        onOpenChange(false);
                      }}
                    >
                      <List className="h-4 w-4 mr-2" />
                      List View
                    </Button>
                    <Button
                      variant={viewMode === "map" ? "default" : "outline"}
                      className="flex-1 h-12"
                      onClick={() => {
                        setViewMode("map");
                        onOpenChange(false);
                      }}
                    >
                      <Map className="h-4 w-4 mr-2" />
                      Map View
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Card Layout Section */}
              <Card>
                <CardContent className="p-4">
                  <h3 className="mb-3 text-sm font-semibold">Card Layout</h3>
                  <div className="flex gap-2">
                    <Button
                      variant={cardLayout === "grid" ? "default" : "outline"}
                      className="flex-1 h-12"
                      onClick={() => {
                        setCardLayout("grid");
                        onOpenChange(false);
                      }}
                    >
                      <LayoutGrid className="h-4 w-4 mr-2" />
                      Grid
                    </Button>
                    <Button
                      variant={cardLayout === "list" ? "default" : "outline"}
                      className="flex-1 h-12"
                      onClick={() => {
                        setCardLayout("list");
                        onOpenChange(false);
                      }}
                    >
                      <Grid className="h-4 w-4 mr-2" />
                      List
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
