"use client";

// New file to implement EmptyMapView component
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@iconify/react";

export const EmptyMapView: React.FC = () => {
  return (
      <Card className="w-full">
        <CardContent className="flex flex-col items-center justify-center py-20">
          <Icon
            icon="lucide:map"
            width={64}
            height={64}
            className="mb-4 text-muted-foreground"
          />
          <h3 className="text-xl font-semibold">Map View Coming Soon</h3>
          <p className="mt-2 text-center text-muted-foreground">
            The map functionality is currently under development.
            <br />
            Please use the list view to explore places.
          </p>
        </CardContent>
      </Card>
  );
};
