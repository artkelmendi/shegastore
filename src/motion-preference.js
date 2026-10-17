import { useSyncExternalStore } from "react";

const query = "(prefers-reduced-motion: reduce)";
const read = () => window.matchMedia(query).matches;
function subscribe(notify) {
  const media = window.matchMedia(query);
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
}

// Read before the first paint and react when the OS setting changes in an open tab.
export function useReducedMotion() {
  return useSyncExternalStore(subscribe, read, () => true);
}
