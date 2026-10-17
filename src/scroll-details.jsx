import { useEffect } from "react";
import { useReducedMotion } from "motion/react";

// Scroll motion belongs to the small decorative marks, not the reading surface.
export function ScrollDetails({ ready, route }) {
  const reduced = useReducedMotion();
  useEffect(() => {
    if (!ready || reduced) return;
    const selector =
      ".brand-band-divider img, .editorial-footnote > img, .about-manifesto > img";
    const observed = new Map();
    const visible = new Set();
    let frame = 0;
    const draw = () => {
      frame = 0;
      const height = innerHeight;
      // Read the unmoving parent so the mark's own transform cannot feed back.
      const updates = [...visible].map((el) => {
        const rect = el.parentElement.getBoundingClientRect();
        const progress = Math.max(
          -1,
          Math.min(1, (height / 2 - rect.top - rect.height / 2) / height),
        );
        return [el, progress];
      });
      updates.forEach(([el, progress]) => {
        el.style.transform = `translate3d(0, ${progress * 5}px, 0) rotate(${progress * 18}deg)`;
      });
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(draw);
    };
    const intersection = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          visible.add(entry.target);
          entry.target.style.willChange = "transform";
        } else {
          visible.delete(entry.target);
          entry.target.style.willChange = "";
        }
      });
      schedule();
    });
    const scan = () =>
      document.querySelectorAll(selector).forEach((el) => {
        if (observed.has(el)) return;
        observed.set(el, el.getAttribute("style"));
        intersection.observe(el);
      });
    scan();
    const mutation = new MutationObserver(scan);
    mutation.observe(document.querySelector(".site-shell"), {
      childList: true,
      subtree: true,
    });
    addEventListener("scroll", schedule, { passive: true });
    addEventListener("resize", schedule, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      intersection.disconnect();
      mutation.disconnect();
      removeEventListener("scroll", schedule);
      removeEventListener("resize", schedule);
      observed.forEach((style, el) =>
        style === null
          ? el.removeAttribute("style")
          : el.setAttribute("style", style),
      );
    };
  }, [ready, reduced, route]);
  return null;
}
