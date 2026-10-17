import React, { useLayoutEffect, useRef } from "react";
import "./origin-entrance.css";

// Keep the original entrance available as a reversible fallback.
const entryPath =
  location.pathname.slice(import.meta.env.BASE_URL.replace(/\/$/, "").length) ||
  "/";
export const originEnabled =
  !/^\/(login|admin|account)(\/|$)/.test(entryPath) &&
  new URLSearchParams(location.search).get("entrance") !== "classic" &&
  !matchMedia("(prefers-reduced-motion: reduce)").matches;
if (originEnabled && !window.__shegaOrigin)
  document.documentElement.dataset.originExperiment = "pending";

const out = "cubic-bezier(0.23, 1, 0.32, 1)";
const unfold = "cubic-bezier(0.77, 0, 0.175, 1)";
// Slow the entire choreography together, preserving overlap and shared origin.
const pace = 1.4;

export function OriginEntrance({ onReveal, onComplete }) {
  const callbacks = useRef({ onReveal, onComplete });
  callbacks.current = { onReveal, onComplete };
  const seed = useRef(null);
  const finish = useRef(null);
  useLayoutEffect(() => {
    const root = document.documentElement;
    const shell = document.querySelector(".site-shell");
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement;
    const animations = [];
    const savedStyles = new Map();
    const timers = new Set();
    let disposed = false,
      completed = false;
    document.body.style.overflow = "hidden";
    root.dataset.originExperiment = "pending";
    const remember = (el) => {
      if (el && !savedStyles.has(el))
        savedStyles.set(el, el.getAttribute("style"));
    };
    remember(shell);
    const initialBox = shell.getBoundingClientRect();
    // Rasterize only the visible scene, under the almost-opaque preparation veil.
    // This avoids a first-use full-page mask/texture upload during the reveal.
    shell.style.maxHeight = `${innerHeight - initialBox.top}px`;
    shell.style.overflow = "clip";
    shell.style.willChange = "clip-path";
    const restore = () => {
      animations.forEach((animation) => animation.cancel());
      savedStyles.forEach((value, el) =>
        value === null
          ? el.removeAttribute("style")
          : el.setAttribute("style", value),
      );
      document.body.style.overflow = previousOverflow;
      root.dataset.originExperiment = "settled";
    };
    const complete = () => {
      if (completed || disposed) return;
      completed = true;
      restore();
      callbacks.current.onComplete();
      window.__shegaOrigin.phase = "settled";
      if (
        previousFocus instanceof HTMLElement &&
        previousFocus !== document.body
      )
        previousFocus.focus({ preventScroll: true });
    };
    finish.current = complete;
    const abort = (event) => {
      if (event.key === "Escape") complete();
    };
    addEventListener("keydown", abort);
    // Resize or an orientation change should settle, never warp a measured scene.
    addEventListener("resize", complete);
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const preference = () => {
      if (reduced.matches) complete();
    };
    reduced.addEventListener("change", preference);
    window.__shegaOrigin = {
      phase: "preparing",
      animations,
      origin: null,
      total: 0,
    };
    const wait = (ms) =>
      new Promise((resolve) => {
        const timer = setTimeout(() => {
          timers.delete(timer);
          resolve();
        }, ms);
        timers.add(timer);
      });
    const frame = () =>
      new Promise((resolve) => requestAnimationFrame(resolve));
    const run = async () => {
      const image = document.querySelector(".hero-image.is-active");
      await Promise.race([
        Promise.all([document.fonts.ready, image?.decode().catch(() => {})]),
        wait(1200),
      ]);
      if (disposed || completed) return;
      callbacks.current.onReveal();
      await frame();
      await frame();
      if (disposed || completed) return;
      const width = document.body.clientWidth;
      const height = innerHeight;
      const ox = width / 2;
      const oy = height / 2;
      // One viewport-space origin is converted into each element's own coordinates.
      const shellBox = shell.getBoundingClientRect();
      const localX = ox - shellBox.left,
        localY = oy - shellBox.top;
      const radius =
        Math.hypot(Math.max(ox, width - ox), Math.max(oy, height - oy)) + 4;
      root.dataset.originExperiment = "unfolding";
      // Reserve one quiet paint before any timeline motion starts.
      const clock = document.timeline.currentTime + 100;
      Object.assign(window.__shegaOrigin, {
        phase: "unfolding",
        origin: [ox, oy],
        started: clock,
        total: 1840 * pace,
      });
      const animate = (el, frames, duration, delay = 0, easing = out) => {
        if (!el) return null;
        const animation = el.animate(frames, {
          duration: duration * pace,
          delay: delay * pace,
          easing,
          fill: "both",
        });
        animation.startTime = clock;
        animations.push(animation);
        return animation;
      };
      remember(shell);
      shell.style.willChange = "clip-path";
      const aperture = animate(
        shell,
        [
          { clipPath: `circle(0px at ${localX}px ${localY}px)` },
          { clipPath: `circle(${radius}px at ${localX}px ${localY}px)` },
        ],
        1400,
        100,
        unfold,
      );
      animate(
        seed.current,
        [
          {
            transform: "translate(-50%, -50%) scale(.4)",
            opacity: 1,
            offset: 0,
          },
          {
            transform: "translate(-50%, -50%) scale(1)",
            opacity: 1,
            offset: 0.3,
          },
          {
            transform: "translate(-50%, -50%) scale(1.35)",
            opacity: 0,
            offset: 1,
          },
        ],
        450,
        0,
        out,
      );
      const emerge = (selector, scale, delay, duration = 1200) => {
        const elements =
          typeof selector === "string"
            ? document.querySelectorAll(selector)
            : [selector];
        elements.forEach((el, i) => {
          if (!el) return;
          const r = el.getBoundingClientRect();
          if (!r.width || !r.height) return;
          remember(el);
          el.style.transformOrigin = `${ox - r.left}px ${oy - r.top}px`;
          el.style.willChange = "transform";
          animate(
            el,
            [{ transform: `scale(${scale})` }, { transform: "scale(1)" }],
            duration,
            delay + i * 32,
            unfold,
          );
        });
      };
      emerge(".hero-image.is-active", 0.8, 100, 1400);
      emerge(".header-brand", 0.006, 100, 1400);
      emerge(".hero-signature", 0.02, 100, 1400);
      emerge(".hero-title-mask", 0.08, 200, 1400);
      emerge(".hero-description", 0.12, 260, 1380);
      emerge(".hero-message > div.hero-enter", 0.14, 300, 1400);
      emerge(".desktop-nav", 0.05, 180, 1400);
      emerge(".header-tools", 0.1, 200, 1400);
      emerge(".hero-pagination", 0.15, 300, 1400);
      emerge(".brand-marquee", 0.6, 320, 1400);
      if (!image) {
        emerge(
          ".page-intro h1, .info-page > h1, .faq-page > h1",
          0.32,
          240,
          1250,
        );
        emerge(
          ".shop-tabs, .shop-toolbar, .product-info > h1, .product-zoom",
          0.7,
          360,
          1250,
        );
      }
      // Transparent margins/background marks join only once the aperture has opened.
      animate(
        document.querySelector(".background-marks"),
        [{ opacity: 0 }, { opacity: 1 }],
        500,
        1190,
      );
      const end = animate(seed.current, [], 1840);
      await end.finished.catch(() => {});
      if (!disposed) complete();
    };
    run().catch((error) => {
      console.warn("Entrance recovered safely:", error);
      complete();
    });
    return () => {
      disposed = true;
      timers.forEach(clearTimeout);
      restore();
      removeEventListener("keydown", abort);
      removeEventListener("resize", complete);
      reduced.removeEventListener("change", preference);
    };
  }, []);
  return (
    <div className="origin-entrance" aria-label="Opening Shega" role="region">
      <span ref={seed} className="origin-seed" aria-hidden="true" />
      <button className="origin-skip" onClick={() => finish.current?.()}>
        Skip entrance
      </button>
    </div>
  );
}
