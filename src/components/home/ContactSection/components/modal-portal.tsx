"use client";

import React from "react";
import ReactDOM from "react-dom";

interface ModalPortalProps {
  children: React.ReactNode;
  container?: HTMLElement;
}

export const ModalPortal: React.FC<ModalPortalProps> = ({
  children,
  container = document.body,
}) => {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  return mounted ? ReactDOM.createPortal(children, container) : null;
};
