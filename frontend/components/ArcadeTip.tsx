"use client";

// tip chip - portal to body so overflow:hidden parents dont clip it
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./ArcadeTip.css";

const PAD = 10;
const GAP = 8;

function placeTip(btnRect: DOMRect, tipRect: DOMRect) {
  // prefer below; flip above if needed. keep inside the viewport
  let top = btnRect.bottom + GAP;
  let left = btnRect.left;
  let place: "below" | "above" = "below";

  if (top + tipRect.height > window.innerHeight - PAD) {
    top = btnRect.top - tipRect.height - GAP;
    place = "above";
  }
  if (top < PAD) top = PAD;

  if (left + tipRect.width > window.innerWidth - PAD) {
    left = window.innerWidth - tipRect.width - PAD;
  }
  if (left < PAD) left = PAD;

  return { top, left, place };
}

export function ArcadeTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, place: "below" as "below" | "above" });
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLSpanElement>(null);
  const tipId = useId();

  useLayoutEffect(() => {
    if (!open || !btnRef.current || !popRef.current) return undefined;
    const measure = () => {
      // remeasure on scroll/resize so the portal tip stays glued to the chip
      const btn = btnRef.current!.getBoundingClientRect();
      const tip = popRef.current!.getBoundingClientRect();
      setCoords(placeTip(btn, tip));
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, text]);

  useEffect(() => {
    if (!open) return undefined;
    // click-away + escape to close
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || popRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!text) return null;

  return (
    <span className="arcade-tip">
      <button
        ref={btnRef}
        type="button"
        className={`arcade-tip-btn${open ? " is-open" : ""}`}
        aria-label="what is this"
        aria-expanded={open}
        aria-controls={tipId}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        ?
      </button>
      {open &&
        createPortal(
          <span
            ref={popRef}
            className={`arcade-tip-pop place-${coords.place}`}
            id={tipId}
            role="tooltip"
            style={{ top: coords.top, left: coords.left }}
          >
            {text}
          </span>,
          document.body
        )}
    </span>
  );
}
