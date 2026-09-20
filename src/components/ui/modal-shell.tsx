"use client";

import { useEffect } from "react";

interface Props {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
  /** Vertically center the dialog instead of aligning it near the top. */
  center?: boolean;
}

/** Flat, hairline modal panel with an Escape-to-close overlay. */
export function ModalShell({
  title,
  onClose,
  children,
  maxWidth = "max-w-2xl",
  center = false,
}: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-center overflow-y-auto bg-black/50 p-6 ${
        center ? "items-center" : "items-start"
      }`}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full ${maxWidth} bg-paper border border-line ${
          center ? "my-8" : "mt-8"
        }`}
      >
        <div className="flex items-center justify-between hairline-b px-5 py-3">
          <h2 className="text-base font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-muted hover:text-text text-xl leading-none cursor-pointer"
          >
            ×
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}