import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useMotionTemplate,
  useReducedMotion,
} from "motion/react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { ArrowUpRight, InstagramLogo, X, Check } from "@phosphor-icons/react";
import { socialLinks } from "./site-config";
import "./finishing.css";

export function InstagramStrip() {
  return (
    <section
      className="instagram-strip page-width"
      data-reveal=""
      aria-labelledby="instagram-heading"
    >
      <span className="instagram-symbol" aria-hidden="true">
        <InstagramLogo size={30} weight="light" />
      </span>
      <div className="instagram-copy">
        <h2 id="instagram-heading">
          See new arrivals and the details up close.
        </h2>
        <p>Follow Wolf Shop on Instagram for more.</p>
      </div>
      <a
        className="instagram-link"
        href={socialLinks.instagram}
        target="_blank"
        rel="noopener noreferrer"
      >
        Open Instagram <ArrowUpRight size={19} aria-hidden="true" />
      </a>
    </section>
  );
}

const consentKey = "wolf-consent-v1";
function getChoice() {
  try {
    const choice = JSON.parse(
      localStorage.getItem(consentKey) ??
        localStorage.getItem("shega-consent-v1"),
    );
    return choice?.version === 1 &&
      typeof choice.optional === "boolean" &&
      Date.now() - choice.time < 180 * 86400000
      ? choice
      : null;
  } catch {
    return null;
  }
}
export function CookieConsent({ ready }) {
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState(getChoice);
  const [details, setDetails] = useState(false);
  const trigger = useRef(null);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (!ready || choice) return;
    const timer = setTimeout(() => setOpen(true), 700);
    return () => clearTimeout(timer);
  }, [ready, choice]);
  useEffect(() => {
    const reopen = () => {
      trigger.current = document.activeElement;
      setOpen(true);
      setDetails(false);
    };
    window.addEventListener("wolf-cookie-settings", reopen);
    return () => window.removeEventListener("wolf-cookie-settings", reopen);
  }, []);
  const save = (optional) => {
    const next = { version: 1, optional, time: Date.now() };
    try {
      localStorage.setItem(consentKey, JSON.stringify(next));
    } catch {}
    setChoice(next);
    setOpen(false);
    window.dispatchEvent(
      new CustomEvent("wolf-consent-change", { detail: next }),
    );
    trigger.current?.focus();
  };
  return (
    <AnimatePresence>
      {open && ready && (
        <motion.section
          className="cookie-panel"
          aria-label="Cookie preferences"
          initial={{
            opacity: 0,
            transform: reduce ? "none" : "translateY(24px)",
          }}
          animate={{ opacity: 1, transform: "translateY(0px)" }}
          exit={{ opacity: 0, transform: reduce ? "none" : "translateY(24px)" }}
          transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
        >
          <div className="cookie-heading">
            <span className="cookie-label">YOUR BROWSER. YOUR CHOICE.</span>
            {choice && (
              <button
                aria-label="Close cookie preferences"
                onClick={() => {
                  setOpen(false);
                  trigger.current?.focus();
                }}
              >
                <X size={18} />
              </button>
            )}
          </div>
          <h2>A small note on cookies.</h2>
          <p>
            We use local storage to keep your bag, saved pieces and consent
            choice. This preview has no analytics or advertising trackers.
          </p>
          <button
            className="cookie-details-toggle"
            aria-expanded={details}
            onClick={() => setDetails(!details)}
          >
            What gets stored? <span>{details ? "−" : "+"}</span>
          </button>
          {details && (
            <div className="cookie-details">
              <p>
                <Check size={14} /> Essential storage: your bag, saved items and
                this choice, plus a session cookie if you sign in.
              </p>
              <p>
                Optional cookies: none installed. Accepting does not add
                trackers. You can change your choice from the footer anytime.
              </p>
              <Link to="/privacy">
                Privacy information <ArrowUpRight size={14} />
              </Link>
            </div>
          )}
          <div className="cookie-actions">
            <button onClick={() => save(false)}>Reject optional</button>
            <button onClick={() => save(true)}>Accept all</button>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}

export function CookieSettingsButton() {
  return (
    <button
      className="cookie-settings-link"
      onClick={() => window.dispatchEvent(new Event("wolf-cookie-settings"))}
    >
      Cookie settings
    </button>
  );
}

export function SmoothExperience({ blocked }) {
  const reduce = useReducedMotion();
  const scroller = useRef(null);
  useEffect(() => {
    if (reduce || !matchMedia("(hover: hover) and (pointer: fine)").matches)
      return;
    const lenis = new Lenis({
      autoRaf: true,
      anchors: true,
      lerp: 0.1,
      smoothWheel: true,
      prevent: (node) =>
        node.closest("dialog, .cookie-panel, [data-lenis-prevent]"),
    });
    scroller.current = lenis;
    return () => {
      lenis.destroy();
      scroller.current = null;
    };
  }, [reduce]);
  useEffect(() => {
    if (blocked) scroller.current?.stop();
    else scroller.current?.start();
  }, [blocked, reduce]);
  return null;
}

export function DetailReveals({ route }) {
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) return;
    const observers = new Set();
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.animate(
            [
              { opacity: 0, transform: "translateY(16px)" },
              { opacity: 1, transform: "translateY(0px)" },
            ],
            {
              duration: 500,
              easing: "cubic-bezier(.23,1,.32,1)",
              fill: "none",
            },
          );
          observer.unobserve(entry.target);
        }),
      { threshold: 0.08 },
    );
    const scan = () =>
      document.querySelectorAll("[data-reveal]").forEach((el) => {
        if (!observers.has(el)) {
          observers.add(el);
          observer.observe(el);
        }
      });
    scan();
    const mutations = new MutationObserver(scan);
    mutations.observe(document.getElementById("main").parentElement, {
      childList: true,
      subtree: true,
    });
    return () => {
      observer.disconnect();
      mutations.disconnect();
    };
  }, [reduced, route]);
  return null;
}

export function RedPointer() {
  const reduce = useReducedMotion();
  const x = useMotionValue(-100),
    y = useMotionValue(-100);
  const dotTransform = useMotionTemplate`translate3d(${x}px, ${y}px, 0)`;
  const [visible, setVisible] = useState(false);
  const [interactive, setInteractive] = useState(false);
  const [pressed, setPressed] = useState(false);
  useEffect(() => {
    if (reduce || !matchMedia("(hover: hover) and (pointer: fine)").matches)
      return;
    const move = (e) => {
      x.set(e.clientX);
      y.set(e.clientY);
      setVisible(true);
    };
    const over = (e) =>
      setInteractive(!!e.target.closest("a,button,input,select,summary"));
    const down = () => setPressed(true);
    const up = () => setPressed(false);
    const leave = () => {
      setVisible(false);
      setPressed(false);
    };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerover", over, { passive: true });
    window.addEventListener("pointerdown", down, { passive: true });
    window.addEventListener("pointerup", up, { passive: true });
    window.addEventListener("pointercancel", up, { passive: true });
    document.documentElement.addEventListener("pointerleave", leave);
    window.addEventListener("blur", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerover", over);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      document.documentElement.removeEventListener("pointerleave", leave);
      window.removeEventListener("blur", leave);
    };
  }, [reduce, x, y]);
  if (reduce) return null;
  return (
    <div
      className={`red-pointer ${visible ? "is-visible" : ""} ${interactive ? "is-interactive" : ""} ${pressed ? "is-pressed" : ""}`}
      aria-hidden="true"
    >
      <motion.span
        className="pointer-dot-position"
        style={{ transform: dotTransform }}
      >
        <span className="pointer-dot" />
      </motion.span>
    </div>
  );
}
