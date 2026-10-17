import { useReducedMotion } from "./motion-preference";
import React, { useEffect, useRef, useState } from "react";

import { WolfWordmark } from "./branding";

export function DrawnHeroLogo() {
  const [replay, setReplay] = useState(0);
  return (
    <button
      className="hero-signature"
      aria-label="Replay Wolf Shop logo drawing"
      title="Replay the logo drawing"
      onClick={() => setReplay((value) => value + 1)}
    >
      <WolfWordmark key={replay} className="hero-drawn-logo" />
    </button>
  );
}

// Small image tiles deform near the pointer. The entire mark never scales on hover.
export function BackgroundMarks({ contained = false }) {
  const canvas = useRef();
  const reduced = useReducedMotion();
  useEffect(() => {
    const element = canvas.current;
    const context = element.getContext("2d", { alpha: true });
    if (!context) return;
    const picture = new Image();
    const texture = document.createElement("canvas");
    texture.width = 345;
    texture.height = 417;
    const warped = document.createElement("canvas");
    warped.width = 256;
    warped.height = 256;
    const warpContext = warped.getContext("2d");
    const pointer = { x: -1000, y: -1000, active: false };
    const marks = contained
      ? [
          [0.08, 0.18, 72, -0.15, 0],
          [0.34, 0.08, 66, 0.18, 2],
          [0.38, 0.83, 84, -0.12, 4],
        ]
      : [
          [0.055, 0.23, 164, -0.17, 0],
          [0.95, 0.39, 190, 0.18, 2],
          [0.16, 0.79, 150, -0.12, 4],
          [0.82, 0.84, 178, 0.12, 1],
          [0.51, 0.12, 118, 0.08, 5],
          [0.48, 0.67, 138, -0.2, 3],
        ];
    let width = 0,
      height = 0,
      ratio = 1,
      frame = 0,
      last = 0,
      disposed = false;
    let ripples = [];
    const scroll = { current: window.scrollY, target: window.scrollY };
    const onScroll = () => {
      scroll.target = window.scrollY;
    };
    const finePointer = matchMedia("(hover: hover) and (pointer: fine)");
    const resize = () => {
      width = element.clientWidth;
      height = element.clientHeight;
      ratio = Math.min(devicePixelRatio || 1, 1.5);
      element.width = Math.round(width * ratio);
      element.height = Math.round(height * ratio);
      if (picture.complete && picture.naturalWidth) draw(performance.now());
    };
    const move = (event) => {
      if (!finePointer.matches) return;
      const rect = element.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      pointer.active = true;
    };
    const leave = () => {
      pointer.active = false;
    };
    const press = (event) => {
      if (reduced) return;
      const rect = element.getBoundingClientRect();
      ripples.push({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        born: performance.now(),
      });
      ripples = ripples.slice(-4);
    };
    function draw(now) {
      if (disposed) return;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);
      const time = reduced ? 0 : now / 1000;
      scroll.current += (scroll.target - scroll.current) * 0.12;
      const travel = reduced || contained ? 0 : scroll.current;
      ripples = ripples.filter((ripple) => now - ripple.born < 2400);
      for (const [nx, ny, base, rotation, phase] of marks) {
        const size = base * (width < 768 ? 0.7 : 1);
        const h = (size * 417) / 345;
        const cx =
          width * nx +
          Math.sin(time * 0.075 + phase) * 22 +
          (Math.sin(travel * 0.0013 + phase) - Math.sin(phase)) * 8;
        const cy =
          height * ny +
          Math.cos(time * 0.065 + phase) * 25 +
          (Math.sin(travel * 0.002 + phase) - Math.sin(phase)) * 18;
        const angle =
          rotation + (reduced ? 0 : Math.sin(time * 0.045 + phase) * 0.035);
        const cos = Math.cos(angle),
          sin = Math.sin(angle);
        const local = (x, y) => ({
          x: (x - cx) * cos + (y - cy) * sin,
          y: -(x - cx) * sin + (y - cy) * cos,
        });
        const mouse = local(pointer.x, pointer.y);
        const distance = Math.hypot(pointer.x - cx, pointer.y - cy);
        const near =
          !reduced && pointer.active
            ? Math.max(0, 1 - distance / (size * 1.1))
            : 0;
        context.save();
        context.translate(cx, cy);
        context.rotate(angle);
        context.globalAlpha = 0.035 + near * 0.035;
        const nearbyRipples = ripples.filter(
          (ripple) =>
            Math.hypot(ripple.x - cx, ripple.y - cy) <
            size + (now - ripple.born) * 0.145 + 90,
        );
        if (reduced || (!near && !nearbyRipples.length)) {
          context.drawImage(texture, -size / 2, -h / 2, size, h);
        } else {
          const waves = nearbyRipples.map((ripple) => ({
            ...local(ripple.x, ripple.y),
            age: (now - ripple.born) / 1000,
          }));
          const warp = (x, y) => {
            let dx = 0,
              dy = 0;
            if (near) {
              const ax = x - mouse.x,
                ay = y - mouse.y;
              const radius = Math.max(24, size * 0.3);
              const strength =
                0.32 *
                near *
                Math.exp(-(ax * ax + ay * ay) / (radius * radius));
              dx += ax * strength;
              dy += ay * strength;
            }
            for (const wave of waves) {
              const ax = x - wave.x,
                ay = y - wave.y,
                d = Math.hypot(ax, ay) || 1;
              const ring = Math.exp(-Math.pow((d - wave.age * 145) / 60, 2));
              const push =
                Math.sin(d / 18 - wave.age * 10) *
                ring *
                Math.exp(-wave.age * 1.6) *
                12;
              dx += (ax / d) * push;
              dy += (ay / d) * push;
            }
            return { x: x + dx, y: y + dy };
          };
          const cells = 12;
          warpContext.setTransform(1, 0, 0, 1, 0, 0);
          warpContext.clearRect(0, 0, 256, 256);
          warpContext.translate(128, 128);
          for (let row = 0; row < cells; row++)
            for (let col = 0; col < cells; col++) {
              const a = warp(
                -size / 2 + (col * size) / cells,
                -h / 2 + (row * h) / cells,
              );
              const b = warp(
                -size / 2 + ((col + 1) * size) / cells,
                -h / 2 + ((row + 1) * h) / cells,
              );
              warpContext.drawImage(
                texture,
                (col * texture.width) / cells,
                (row * texture.height) / cells,
                texture.width / cells,
                texture.height / cells,
                a.x,
                a.y,
                b.x - a.x + 0.5,
                b.y - a.y + 0.5,
              );
            }
          context.drawImage(warped, -128, -128);
        }
        context.restore();
      }
    }
    const tick = (now) => {
      if (now - last > 1000 / 30) {
        draw(now);
        last = now;
      }
      frame = requestAnimationFrame(tick);
    };
    picture.onload = () => {
      texture.getContext("2d").drawImage(picture, 0, 0, 345, 417);
      resize();
      cancelAnimationFrame(frame);
      if (!reduced) frame = requestAnimationFrame(tick);
    };
    const loadArtwork = () => {
      picture.src = `${import.meta.env.BASE_URL}logos/wolf-ticket-${document.documentElement.dataset.theme === "dark" ? "dark" : "light"}.svg`;
    };
    loadArtwork();
    addEventListener("wolf-theme-change", loadArtwork);
    addEventListener("resize", resize);
    if (!reduced) addEventListener("scroll", onScroll, { passive: true });
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    addEventListener("pointermove", move, { passive: true });
    addEventListener("pointerdown", press, { passive: true });
    addEventListener("blur", leave);
    document.documentElement.addEventListener("pointerleave", leave);
    return () => {
      disposed = true;
      picture.onload = null;
      removeEventListener("wolf-theme-change", loadArtwork);
      cancelAnimationFrame(frame);
      observer.disconnect();
      removeEventListener("resize", resize);
      removeEventListener("scroll", onScroll);
      removeEventListener("pointermove", move);
      removeEventListener("pointerdown", press);
      removeEventListener("blur", leave);
      document.documentElement.removeEventListener("pointerleave", leave);
    };
  }, [reduced, contained]);
  return (
    <canvas
      ref={canvas}
      className={`background-marks ${contained ? "hero-background-marks" : ""}`}
      aria-hidden="true"
    />
  );
}
