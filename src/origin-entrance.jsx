import React, { useLayoutEffect, useRef } from "react";
import { WolfEyes } from "./branding";
import "./origin-entrance.css";

const entryPath =
  location.pathname.slice(import.meta.env.BASE_URL.replace(/\/$/, "").length) ||
  "/";
export const originEnabled =
  !/^\/(login|admin|account)(\/|$)/.test(entryPath) &&
  new URLSearchParams(location.search).get("entrance") !== "classic" &&
  !matchMedia("(prefers-reduced-motion: reduce)").matches;
if (originEnabled)
  document.documentElement.dataset.originExperiment = "pending";
const out = "cubic-bezier(0.23, 1, 0.32, 1)",
  unfold = "cubic-bezier(0.77, 0, 0.175, 1)";

export function OriginEntrance({ onReveal, onComplete }) {
  const callbacks = useRef({ onReveal, onComplete });
  callbacks.current = { onReveal, onComplete };
  const entrance = useRef(),
    emblem = useRef(),
    veil = useRef(),
    finish = useRef();
  useLayoutEffect(() => {
    entrance.current.style.visibility = "visible";
    const root = document.documentElement,
      shell = document.querySelector(".site-shell");
    const previousOverflow = document.body.style.overflow,
      originalStyles = new Map(),
      animations = [],
      timers = new Set();
    let disposed = false,
      settled = false;
    const remember = (el) => {
      if (el && !originalStyles.has(el))
        originalStyles.set(el, el.getAttribute("style"));
    };
    remember(shell);
    const ox = document.body.clientWidth / 2,
      oy = innerHeight / 2;
    // Keep the document at its real height throughout the handoff. A temporary
    // viewport crop changes scroll measurements and can snap the hero on release.
    shell.style.opacity = "0";
    shell.style.willChange = "opacity";
    // The page and eyes share a white field, but have independent compositing.
    shell.style.position = "relative";
    shell.style.zIndex = "71";
    document.body.style.overflow = "hidden";
    root.dataset.originExperiment = "pending";
    const restore = () => {
      // Cancelling the veil's finished fade restores its CSS opacity to 1.
      // Hide the entire intro before cancellation or dropping the page's z-index;
      // React may commit the unmount on a later frame, especially on mobile.
      entrance.current.style.visibility = "hidden";
      animations.forEach((animation) => animation.cancel());
      originalStyles.forEach((style, el) =>
        style === null
          ? el.removeAttribute("style")
          : el.setAttribute("style", style),
      );
      document.body.style.overflow = previousOverflow;
      root.dataset.originExperiment = "settled";
    };
    const complete = () => {
      if (disposed || settled) return;
      settled = true;
      restore();
      window.__wolfOrigin.phase = "settled";
      callbacks.current.onComplete();
    };
    finish.current = complete;
    const escape = (event) => {
      if (event.key === "Escape") complete();
    };
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const initialWidth = innerWidth;
    const resize = () => {
      // Safari's browser bars resize the visual viewport during first paint.
      // Only a substantial width/orientation change should interrupt the intro.
      if (Math.abs(innerWidth - initialWidth) > 64) complete();
    };
    const preference = () => {
      if (reduced.matches) complete();
    };
    addEventListener("keydown", escape);
    addEventListener("resize", resize);
    reduced.addEventListener("change", preference);
    const clock = document.timeline.currentTime + 40;
    window.__wolfOrigin = {
      phase: "eyes",
      animations,
      started: clock,
      origin: [ox, oy],
    };
    const animate = (
      el,
      frames,
      duration,
      delay = 0,
      easing = out,
      start = clock,
    ) => {
      if (!el) return null;
      const animation = el.animate(frames, {
        duration,
        delay,
        easing,
        fill: "both",
      });
      animation.startTime = start;
      animations.push(animation);
      return animation;
    };
    const art = emblem.current.querySelector("svg");
    // The gaze resolves and eases inward without squeezing the eye contours.
    // Both eyes hold their expression before the shared forward dive.
    emblem.current.querySelectorAll(".wolf-eye").forEach((eye, index) =>
      animate(
        eye,
        [
          {
            opacity: 0,
            transform: `translateX(${index === 0 ? "-5%" : "5%"}) scale(.97)`,
          },
          { opacity: 1, transform: "translateX(0%) scale(1)" },
        ],
        1000,
        80,
        out,
      ),
    );
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
        wait(1500),
      ]);
      if (disposed || settled) return;
      callbacks.current.onReveal();
      await frame();
      await frame();
      if (disposed || settled) return;
      const pageClock = Math.max(
        clock + 1450,
        document.timeline.currentTime + 32,
      );
      root.dataset.originExperiment = "unfolding";
      window.__wolfOrigin.phase = "revealing";
      // A small intake, then the eyes pass the camera as the page opens beneath.
      // The approved ticket and wordmark remain hidden for the entire intro.
      animate(
        art,
        [
          { transform: "scale(1)", opacity: 1, offset: 0 },
          { transform: "scale(.94)", opacity: 1, offset: 0.18 },
          { transform: "scale(1.9)", opacity: 0.9, offset: 0.52 },
          { transform: "scale(6)", opacity: 0, offset: 1 },
        ],
        1100,
        0,
        unfold,
        pageClock,
      );
      window.__wolfOrigin.revealStart = pageClock;
      animate(
        veil.current,
        [{ opacity: 1 }, { opacity: 0 }],
        1050,
        240,
        out,
        pageClock,
      );
      animate(
        shell,
        [{ opacity: 0 }, { opacity: 1 }],
        1050,
        240,
        out,
        pageClock,
      );
      const photography = document.querySelector(".hero-photography");
      if (photography) {
        const resting = getComputedStyle(photography).transform;
        animate(
          photography,
          [
            {
              opacity: 0.4,
              transform: `${resting === "none" ? "" : resting} scale(1.035)`,
            },
            { opacity: 1, transform: resting },
          ],
          1250,
          160,
          out,
          pageClock,
        );
      }
      document
        .querySelectorAll(
          ".header-brand,.mobile-shop-link,.desktop-nav,.header-tools,.hero-signature,.hero-title-mask,.hero-description,.hero-message > div.hero-enter,.hero-pagination,.page-intro,.product-detail",
        )
        .forEach((el, index) => {
          const box = el.getBoundingClientRect();
          if (!box.width || box.top > innerHeight) return;
          const resting = getComputedStyle(el).transform;
          animate(
            el,
            [
              {
                opacity: 0,
                transform: `${resting === "none" ? "" : resting} translateY(18px)`,
              },
              { opacity: 1, transform: resting },
            ],
            950,
            360 + Math.min(index * 45, 300),
            out,
            pageClock,
          );
        });
      animate(
        document.querySelector(".background-marks"),
        [{ opacity: 0 }, { opacity: 1 }],
        650,
        850,
        out,
        pageClock,
      );
      // Never discard a child's animation early when its parent has finished.
      // Wait for the last stagger, then remove only settled animation layers.
      await Promise.all(
        animations.map((animation) => animation.finished.catch(() => {})),
      );
      if (!disposed) complete();
    };
    run().catch(() => complete());
    return () => {
      disposed = true;
      timers.forEach(clearTimeout);
      restore();
      removeEventListener("keydown", escape);
      removeEventListener("resize", resize);
      reduced.removeEventListener("change", preference);
    };
  }, []);
  return (
    <div
      ref={entrance}
      className="origin-entrance"
      aria-label="Waking Wolf Shop"
      role="region"
    >
      <div ref={veil} className="origin-veil" />
      <div ref={emblem} className="origin-emblem">
        <WolfEyes />
      </div>
      <button className="origin-skip" onClick={() => finish.current?.()}>
        Skip entrance
      </button>
    </div>
  );
}
