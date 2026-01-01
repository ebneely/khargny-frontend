import React from "react";
import { ViewMode } from "@/types";

export const useViewMode = () => {
  const [viewMode, setViewMode] = React.useState<ViewMode>("list");

  return {
    viewMode,
    setViewMode,
    isList: viewMode === "list",
    isMap: viewMode === "map",
  };
};
