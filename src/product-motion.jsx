import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useReducedMotion } from "./motion-preference";

// Decode before switching so a slow response never leaves a blank frame.
// Only opacity changes; zoom/hover transforms and image geometry remain intact.
export function ProductImage({ src, alt, ...props }) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState({ src, alt });
  const [previous, setPrevious] = useState(null);
  const currentRef = useRef(null),
    previousRef = useRef(null);
  const shownRef = useRef(shown);
  shownRef.current = shown;
  useEffect(() => {
    if (src === shownRef.current.src) return;
    let disposed = false;
    const next = new Image();
    next.decoding = "async";
    next.src = src;
    next
      .decode()
      .catch(() => {})
      .then(() => {
        if (disposed) return;
        setPrevious(shownRef.current);
        setShown({ src, alt });
      });
    return () => {
      disposed = true;
    };
  }, [src, alt]);
  useLayoutEffect(() => {
    if (!previous || !currentRef.current || !previousRef.current) return;
    const outgoing = previousRef.current;
    const timing = {
      duration: reduced ? 140 : 280,
      easing: "cubic-bezier(0.23, 1, 0.32, 1)",
    };
    const leaving = outgoing.animate([{ opacity: 1 }, { opacity: 0 }], {
      ...timing,
      fill: "forwards",
    });
    let disposed = false;
    // Keep the decoded incoming frame fully opaque underneath. Fading both
    // layers would expose the backdrop halfway through and look like a flash.
    leaving.finished
      .then(() => {
        if (disposed) return;
        outgoing.hidden = true;
        setPrevious(null);
      })
      .catch(() => {});
    return () => {
      disposed = true;
      leaving.cancel();
    };
  }, [shown.src, previous?.src, reduced]);
  return (
    <>
      <img {...props} ref={currentRef} src={shown.src} alt={shown.alt} />
      {previous && (
        <img
          {...props}
          key={previous.src}
          ref={previousRef}
          src={previous.src}
          alt=""
          aria-hidden="true"
          loading="eager"
          className={`${(props.className || "").replace(/\bis-active\b/g, "")} product-transition-previous`}
        />
      )}
    </>
  );
}
