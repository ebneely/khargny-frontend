import { create } from 'zustand';

interface GlobalState {
  marquebut: boolean;
  setmarquebut: (marquebut: boolean) => void;
  isActive: boolean;
  setisActive: (isActive: boolean) => void;
  isFilterOpen: boolean;
  setIsFilterOpen: (open: boolean) => void;
}

export const useGlobalStore = create<GlobalState>((set) => ({
  marquebut: false,
  setmarquebut: (marquebut) => set({ marquebut }),
  isActive: false,
  setisActive: (isActive) => set({ isActive }),
  isFilterOpen: false,
  setIsFilterOpen: (isFilterOpen) => set({ isFilterOpen }),
}));

