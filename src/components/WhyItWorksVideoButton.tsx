"use client";

import { useEffect, useId, useRef, useState } from "react";

export const TERRY_WHY_IT_WORKS_VIDEO_SRC = "/Images/Terry-Sizzle-Reel-Website.mp4";

type WhyItWorksVideoButtonProps = {
  /** `button` = secondary CTA; `nav` / `menu` = header link look. */
  variant?: "button" | "nav" | "menu";
};

export default function WhyItWorksVideoButton({
  variant = "button"
}: WhyItWorksVideoButtonProps) {
  const [open, setOpen] = useState(false);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtnRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  const triggerClass =
    variant === "button"
      ? "button button-secondary"
      : variant === "nav"
        ? "why-it-works-nav"
        : "why-it-works-menu";

  return (
    <>
      <button type="button" className={triggerClass} onClick={() => setOpen(true)}>
        Why it works!
      </button>
      {open && (
        <div
          className="why-it-works-modal-backdrop"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div
            className="why-it-works-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="why-it-works-modal-header">
              <h2 id={titleId} style={{ margin: 0, fontSize: 18 }}>
                Why it works!
              </h2>
              <button
                ref={closeBtnRef}
                type="button"
                className="button button-secondary"
                onClick={() => setOpen(false)}
                aria-label="Close video"
              >
                Close
              </button>
            </div>
            <video
              key={TERRY_WHY_IT_WORKS_VIDEO_SRC}
              controls
              playsInline
              autoPlay
              preload="metadata"
              style={{ width: "100%", maxHeight: "70vh", borderRadius: 8, display: "block" }}
            >
              <source src={TERRY_WHY_IT_WORKS_VIDEO_SRC} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      )}
    </>
  );
}
