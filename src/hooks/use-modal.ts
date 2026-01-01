import { useState, useCallback } from "react";

/**
 * Custom hook to replace HeroUI's useDisclosure
 * Provides modal state management
 */
export function useModal(initialState = false) {
  const [isOpen, setIsOpen] = useState(initialState);

  const onOpen = useCallback(() => setIsOpen(true), []);
  const onClose = useCallback(() => setIsOpen(false), []);
  const onOpenChange = useCallback((open: boolean) => setIsOpen(open), []);
  const onToggle = useCallback(() => setIsOpen((prev) => !prev), []);

  return {
    isOpen,
    onOpen,
    onClose,
    onOpenChange,
    onToggle,
  };
}

