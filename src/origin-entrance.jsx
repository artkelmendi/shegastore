import React, { useLayoutEffect, useRef } from "react";
import { WolfEyes } from "./branding";
import "./origin-entrance.css";

const entryPath =
  location.pathname.slice(import.meta.env.BASE_URL.replace(/\/$/, "").length) ||
  "/";
export const originEnabled =
  !/^\/(login|admin|account)(\/|$)/.test(entryPath) &&
  new URLSearchParams(location.search).get("entrance") !== "classic";
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
    entrance.current.hidden = false;
    entrance.current.style.visibility = "visible";
    const root = document.documentElement;
    const animations = [],
      timers = new Set();
    let disposed = false,
      settled = false;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const gentle = reduced.matches;
    const preventWheel = (event) => event.preventDefault();
    entrance.current.addEventListener("wheel", preventWheel, {
      passive: false,
    });
    root.dataset.originExperiment = "pending";
    // Keep the page in its normal stacking context. Only this viewport-sized
    // cover fades; promoting a full document containing fixed/backdrop layers
    // makes Safari rebuild those layers at the exact moment the intro ends.
    const restore = () => {
      if (entrance.current) {
        entrance.current.hidden = true;
        entrance.current.style.visibility = "hidden";
      }
      animations.forEach((animation) => animation.cancel());
      root.dataset.originExperiment = "settled";
    };
    const complete = (reason = "finished") => {
      if (disposed || settled) return;
      settled = true;
      window.__wolfOrigin.phase = "settling";
      window.__wolfOrigin.reason =
        typeof reason === "string" ? reason : "interrupted";
      restore();
      window.__wolfOrigin.phase = "settled";
      callbacks.current.onComplete();
    };
    finish.current = complete;
    const escape = (event) => {
      if (event.key === "Escape") complete("escape");
    };
    const preference = () => {
      if (reduced.matches) complete("motion-preference-change");
    };
    addEventListener("keydown", escape);
    reduced.addEventListener("change", preference);
    let clock = 0;
    window.__wolfOrigin = {
      phase: "waiting",
      mode: gentle ? "gentle" : "full",
      reducedMotion: gentle,
      animations,
      started: null,
      viewport: [innerWidth, innerHeight],
      error: null,
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
    let visibilityCleanup = () => {};
    const run = async () => {
      // A preloaded/background Safari tab must not consume the entrance before
      // it has ever been painted in the foreground.
      if (document.hidden)
        await new Promise((resolve) => {
          const visible = () => {
            if (!document.hidden) {
              document.removeEventListener("visibilitychange", visible);
              resolve();
            }
          };
          document.addEventListener("visibilitychange", visible);
          visibilityCleanup = () => {
            document.removeEventListener("visibilitychange", visible);
            resolve();
          };
        });
      await frame();
      if (disposed || settled) return;
      clock = (document.timeline.currentTime ?? performance.now()) + 40;
      Object.assign(window.__wolfOrigin, { phase: "eyes", started: clock });
      emblem.current
        .querySelectorAll(".wolf-eye")
        .forEach((eye) =>
          animate(
            eye,
            [{ opacity: 0 }, { opacity: 1 }],
            gentle ? 350 : 1000,
            80,
          ),
        );
      const image = document.querySelector(".hero-image.is-active");
      await Promise.race([
        Promise.all([document.fonts.ready, image?.decode().catch(() => {})]),
        wait(gentle ? 900 : 1500),
      ]);
      if (disposed || settled) return;
      callbacks.current.onReveal();
      await frame();
      await frame();
      if (disposed || settled) return;
      const pageClock = Math.max(
        clock + (gentle ? 600 : 1450),
        document.timeline.currentTime + 32,
      );
      root.dataset.originExperiment = "unfolding";
      window.__wolfOrigin.phase = "revealing";
      window.__wolfOrigin.revealStart = pageClock;
      animate(
        art,
        gentle
          ? [{ opacity: 1 }, { opacity: 0 }]
          : [
              { transform: "scale(1)", opacity: 1, offset: 0 },
              { transform: "scale(.94)", opacity: 1, offset: 0.18 },
              { transform: "scale(1.8)", opacity: 0.6, offset: 0.52 },
              { transform: "scale(3)", opacity: 0, offset: 1 },
            ],
        gentle ? 350 : 1100,
        0,
        gentle ? out : unfold,
        pageClock,
      );
      animate(
        veil.current,
        [{ opacity: 1 }, { opacity: 0 }],
        gentle ? 450 : 1050,
        gentle ? 100 : 240,
        out,
        pageClock,
      );
      const photography = document.querySelector(".hero-photography");
      if (photography && !gentle) {
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
          if (gentle) return;
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
      if (!gentle)
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
      // Let the final transparent cover frame reach Safari's compositor before
      // removing the overlay layer. The underlying document never changes layer.
      await frame();
      await frame();
      if (!disposed) complete();
    };
    run().catch(async (error) => {
      if (disposed || settled) return;
      window.__wolfOrigin.error = error?.message || String(error);
      root.dataset.originExperiment = "unfolding";
      callbacks.current.onReveal();
      try {
        const fallback = animate(
          veil.current,
          [{ opacity: 1 }, { opacity: 0 }],
          250,
          0,
          out,
          document.timeline.currentTime ?? performance.now(),
        );
        await fallback.finished;
      } catch {}
      complete("fallback");
    });
    return () => {
      disposed = true;
      timers.forEach(clearTimeout);
      restore();
      removeEventListener("keydown", escape);
      visibilityCleanup();
      entrance.current?.removeEventListener("wheel", preventWheel);
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
